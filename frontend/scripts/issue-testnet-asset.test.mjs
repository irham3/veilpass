import { describe, expect, test } from "vitest";

import { buildIssueSummary, parseEnvText, requireIssueConfig } from "./issue-testnet-asset.mjs";

const envText = [
  "VEILPASS_ASSET_CODE=VPT",
  "VEILPASS_ASSET_ISSUER=GASSETISSUER",
  "VEILPASS_MIN_BALANCE=1",
  "VEILPASS_ISSUER_SECRET=issuer-secret",
].join("\n");

describe("testnet asset issuer", () => {
  test("ignores blank, commented, and malformed lines while unquoting values", () => {
    expect(parseEnvText("\n# comment\nMALFORMED\nQUOTED=\" value \"\nSINGLE='secret'\n")).toEqual({
      QUOTED: " value ",
      SINGLE: "secret",
    });
  });

  test("preserves unquoted values including embedded equals signs", () => {
    expect(parseEnvText("VEILPASS_TOKEN=a=b=c")).toEqual({ VEILPASS_TOKEN: "a=b=c" });
  });

  test("preserves unquoted values including embedded equals signs", () => {
    expect(parseEnvText("VEILPASS_TOKEN=a=b=c")).toEqual({ VEILPASS_TOKEN: "a=b=c" });
  });

  test("loads only the values required to issue the configured asset", () => {
    const config = requireIssueConfig(parseEnvText(envText));

    expect(config).toEqual({
      assetCode: "VPT",
      assetIssuer: "GASSETISSUER",
      amount: "1",
      issuerSecret: "issuer-secret",
    });
  });

  test("rejects incomplete local environment files before network calls", () => {
    expect(() => requireIssueConfig({ VEILPASS_ASSET_CODE: "VPT" })).toThrow(/VEILPASS_ASSET_ISSUER/);
  });

  test("explains that native XLM does not use the credit-asset issuer script", () => {
    expect(() => requireIssueConfig({ VEILPASS_ASSET_TYPE: "native" })).toThrow(/only for an issued credit-asset fixture/);
  });

  test("summarizes the issued asset without printing the issuer secret", () => {
    const summary = buildIssueSummary({
      assetCode: "VPT",
      assetIssuer: "GASSETISSUER",
      destination: "GDESTINATION",
      amount: "1",
      txHash: "abc123",
      issuerSecret: "issuer-secret",
    });

    expect(summary).toContain("1 VPT");
    expect(summary).toContain("GDESTINATION");
    expect(summary).toContain("abc123");
    expect(summary).not.toContain("issuer-secret");
  });
});
