import { describe, expect, it } from "vitest";

import { accountHasAssetTrustline, accountMeetsAssetRule } from "./eligibility";

describe("accountMeetsAssetRule", () => {
  const account = { balances: [{ asset_type: "credit_alphanum4", asset_code: "PASS", asset_issuer: "GISSUER", balance: "12.5000000" }, { asset_type: "native", balance: "100" }] };
  it("matches exact code, issuer, and minimum balance", () => {
    expect(accountMeetsAssetRule(account, { code: "PASS", issuer: "GISSUER", minimum: 10 })).toBe(true);
    expect(accountMeetsAssetRule(account, { code: "PASS", issuer: "GISSUER", minimum: 13 })).toBe(false);
  });
  it("does not confuse native or similarly named assets", () => {
    expect(accountMeetsAssetRule(account, { code: "PASS", issuer: "GOTHER", minimum: 1 })).toBe(false);
    expect(accountMeetsAssetRule(account, { code: "pass", issuer: "GISSUER", minimum: 1 })).toBe(false);
  });
  it("recognizes a zero-balance trustline without treating it as eligible", () => {
    const emptyTrustline = { balances: [{ asset_type: "credit_alphanum4", asset_code: "PASS", asset_issuer: "GISSUER", balance: "0.0000000" }] };
    expect(accountHasAssetTrustline(emptyTrustline, { code: "PASS", issuer: "GISSUER" })).toBe(true);
    expect(accountMeetsAssetRule(emptyTrustline, { code: "PASS", issuer: "GISSUER", minimum: 1 })).toBe(false);
  });
});
