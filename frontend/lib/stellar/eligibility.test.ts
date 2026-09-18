import { afterEach, describe, expect, it, vi } from "vitest";

import { accountHasAssetTrustline, accountMeetsAssetRule, checkTestnetEligibility, configuredAssetRule } from "./eligibility";

const originalEnvironment = {
  VEILPASS_ASSET_CODE: process.env.VEILPASS_ASSET_CODE,
  VEILPASS_ASSET_ISSUER: process.env.VEILPASS_ASSET_ISSUER,
  VEILPASS_ASSET_TYPE: process.env.VEILPASS_ASSET_TYPE,
  VEILPASS_MIN_BALANCE: process.env.VEILPASS_MIN_BALANCE,
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("accountMeetsAssetRule", () => {
  const account = { balances: [{ asset_type: "credit_alphanum4", asset_code: "PASS", asset_issuer: "GISSUER", balance: "12.5000000" }, { asset_type: "native", balance: "100" }] };
  it("matches exact code, issuer, and minimum balance", () => {
    expect(accountMeetsAssetRule(account, { type: "credit", code: "PASS", issuer: "GISSUER", minimum: 10 })).toBe(true);
    expect(accountMeetsAssetRule(account, { type: "credit", code: "PASS", issuer: "GISSUER", minimum: 13 })).toBe(false);
  });
  it("does not confuse native or similarly named assets", () => {
    expect(accountMeetsAssetRule(account, { type: "credit", code: "PASS", issuer: "GOTHER", minimum: 1 })).toBe(false);
    expect(accountMeetsAssetRule(account, { type: "credit", code: "pass", issuer: "GISSUER", minimum: 1 })).toBe(false);
  });
  it("recognizes a zero-balance trustline without treating it as eligible", () => {
    const emptyTrustline = { balances: [{ asset_type: "credit_alphanum4", asset_code: "PASS", asset_issuer: "GISSUER", balance: "0.0000000" }] };
    expect(accountHasAssetTrustline(emptyTrustline, { type: "credit", code: "PASS", issuer: "GISSUER" })).toBe(true);
    expect(accountMeetsAssetRule(emptyTrustline, { type: "credit", code: "PASS", issuer: "GISSUER", minimum: 1 })).toBe(false);
  });

  it("fails closed for accounts without balances and balances missing a numeric amount", () => {
    expect(accountMeetsAssetRule({}, { type: "credit", code: "PASS", issuer: "GISSUER", minimum: 1 })).toBe(false);
    expect(accountHasAssetTrustline({}, { type: "credit", code: "PASS", issuer: "GISSUER" })).toBe(false);
    expect(accountHasAssetTrustline({ balances: null as unknown as [] }, { type: "credit", code: "PASS", issuer: "GISSUER" })).toBe(false);
    expect(accountMeetsAssetRule({ balances: [{ asset_type: "credit_alphanum4", asset_code: "PASS", asset_issuer: "GISSUER" }] }, { type: "credit", code: "PASS", issuer: "GISSUER", minimum: 1 })).toBe(false);
    expect(accountHasAssetTrustline({ balances: [{ asset_type: "native", asset_code: "PASS", asset_issuer: "GISSUER", balance: "100" }] }, { type: "credit", code: "PASS", issuer: "GISSUER" })).toBe(false);
  });

  it("supports native XLM without a trustline or issuer", () => {
    expect(accountMeetsAssetRule(account, { type: "native", code: "XLM", minimum: 100 })).toBe(true);
    expect(accountMeetsAssetRule(account, { type: "native", code: "XLM", minimum: 101 })).toBe(false);
    expect(accountHasAssetTrustline(account, { type: "native", code: "XLM" })).toBe(true);
    expect(accountMeetsAssetRule({ balances: [{ asset_type: "credit_alphanum4", balance: "100" }] }, { type: "native", code: "XLM", minimum: 1 })).toBe(false);
    expect(accountMeetsAssetRule({ balances: [{ asset_type: "native" }] }, { type: "native", code: "XLM", minimum: 1 })).toBe(false);
    expect(accountHasAssetTrustline({ balances: [{ asset_type: "credit_alphanum4", balance: "100" }] }, { type: "native", code: "XLM" })).toBe(false);
  });
});

describe("checkTestnetEligibility", () => {
  it("fails closed without a complete, positive asset rule", async () => {
    process.env.VEILPASS_ASSET_TYPE = "credit";
    delete process.env.VEILPASS_ASSET_CODE;
    delete process.env.VEILPASS_ASSET_ISSUER;
    process.env.VEILPASS_MIN_BALANCE = "0";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkTestnetEligibility("GADDRESS")).resolves.toEqual({
      eligible: false,
      configured: false,
      hasTrustline: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses an encoded Horizon path and evaluates both balance and trustline", async () => {
    process.env.VEILPASS_ASSET_CODE = "PASS";
    process.env.VEILPASS_ASSET_ISSUER = "GISSUER";
    process.env.VEILPASS_ASSET_TYPE = "credit";
    process.env.VEILPASS_MIN_BALANCE = "10";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      balances: [{
        asset_type: "credit_alphanum4",
        asset_code: "PASS",
        asset_issuer: "GISSUER",
        balance: "12.5",
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkTestnetEligibility("G/unsafe path")).resolves.toEqual({
      eligible: true,
      configured: true,
      hasTrustline: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org/accounts/G%2Funsafe%20path",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("treats a Horizon failure as configured but ineligible", async () => {
    process.env.VEILPASS_ASSET_CODE = "PASS";
    process.env.VEILPASS_ASSET_ISSUER = "GISSUER";
    process.env.VEILPASS_ASSET_TYPE = "credit";
    process.env.VEILPASS_MIN_BALANCE = "1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(checkTestnetEligibility("GMISSING")).resolves.toEqual({
      eligible: false,
      configured: true,
      hasTrustline: false,
    });
  });

  it("defaults the minimum balance to one unit when omitted", async () => {
    process.env.VEILPASS_ASSET_CODE = "PASS";
    process.env.VEILPASS_ASSET_ISSUER = "GISSUER";
    process.env.VEILPASS_ASSET_TYPE = "credit";
    delete process.env.VEILPASS_MIN_BALANCE;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ balances: [{ asset_type: "credit_alphanum4", asset_code: "PASS", asset_issuer: "GISSUER", balance: "1" }] }), { status: 200 })));
    await expect(checkTestnetEligibility("GADDRESS")).resolves.toMatchObject({ eligible: true, configured: true });
  });

  it("uses the native XLM rule without an issuer or trustline", async () => {
    process.env.VEILPASS_ASSET_TYPE = "native";
    delete process.env.VEILPASS_ASSET_CODE;
    delete process.env.VEILPASS_ASSET_ISSUER;
    process.env.VEILPASS_MIN_BALANCE = "1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ balances: [{ asset_type: "native", balance: "1.5" }] }), { status: 200 })));

    await expect(checkTestnetEligibility("GADDRESS")).resolves.toEqual({ eligible: true, configured: true, hasTrustline: true });
    expect(configuredAssetRule()).toEqual({ type: "native", code: "XLM", minimum: 1 });
  });

  it("rejects an unsupported asset mode", () => {
    expect(configuredAssetRule({ VEILPASS_ASSET_TYPE: "anything", VEILPASS_MIN_BALANCE: "1" })).toBeNull();
    expect(configuredAssetRule({ VEILPASS_ASSET_TYPE: "native", VEILPASS_ASSET_CODE: "USDC", VEILPASS_MIN_BALANCE: "1" })).toEqual({ type: "native", code: "XLM", minimum: 1 });
    expect(configuredAssetRule({ VEILPASS_ASSET_TYPE: "native", VEILPASS_MIN_BALANCE: "0" })).toBeNull();
    expect(configuredAssetRule({ VEILPASS_MIN_BALANCE: "1" })).toBeNull();
    expect(configuredAssetRule({ VEILPASS_ASSET_ISSUER: "GISSUER", VEILPASS_ASSET_CODE: "USDC", VEILPASS_MIN_BALANCE: "1" })).toEqual({ type: "credit", code: "USDC", issuer: "GISSUER", minimum: 1 });
    expect(configuredAssetRule({ VEILPASS_ASSET_TYPE: "credit", VEILPASS_ASSET_CODE: "bad-code!", VEILPASS_ASSET_ISSUER: "GISSUER", VEILPASS_MIN_BALANCE: "1" })).toBeNull();
  });
});
