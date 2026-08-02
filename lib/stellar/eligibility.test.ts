import { describe, expect, it } from "vitest";

import { accountMeetsAssetRule } from "./eligibility";

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
});
