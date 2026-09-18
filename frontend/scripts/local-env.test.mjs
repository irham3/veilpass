import { describe, expect, test } from "vitest";

import { buildLocalEnvText, buildSetupSummary } from "./local-env-format.mjs";

const values = {
  hostOrigin: "http://localhost:3000",
  loginOrigin: "http://localhost:3000",
  rpcUrl: "https://soroban-testnet.stellar.org",
  contractId: "CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK",
  sourceAccount: "GDVP7QVOCQ4L4CDNXVWD53ATXGYDXTDOYVFPJ3UA5OTWJW7XGXSNFXRJ",
  gateId: "premium-holder",
  gateEpoch: 1,
  credentialRoot: "0000000000000000000000000000000000000000000000000000000000000000",
  assetType: "native",
  assetCode: "XLM",
  assetIssuer: "",
  minBalance: "1",
  simulatorKey: "simulator-secret",
  issuerSecret: "issuer-secret",
  fixtureCredential: "fixture-secret",
};

describe("local environment setup", () => {
  test("renders a usable ignored .env.local without production database defaults", () => {
    const text = buildLocalEnvText(values);

    expect(text).toContain("NEXT_PUBLIC_VEILPASS_CONTRACT_ID=CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK");
    expect(text).toContain("VEILPASS_CREDENTIAL_ROOT=0000000000000000000000000000000000000000000000000000000000000000");
    expect(text).toContain("VEILPASS_ASSET_TYPE=native");
    expect(text).toContain("VEILPASS_ASSET_CODE=XLM");
    expect(text).toContain("VEILPASS_ASSET_ISSUER=");
    expect(text).toContain("VEILPASS_ISSUER_SECRET=issuer-secret");
    expect(text).not.toMatch(/^DATABASE_URL=/m);
  });

  test("prints only public setup details", () => {
    const summary = buildSetupSummary({ envPath: "D:/Work/00/Veilpass/frontend/.env.local", funded: true, values });

    expect(summary).toContain(".env.local");
    expect(summary).toContain("native XLM");
    expect(summary).toContain("CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK");
    expect(summary).not.toContain("issuer-secret");
    expect(summary).not.toContain("simulator-secret");
    expect(summary).not.toContain("fixture-secret");
  });
});
