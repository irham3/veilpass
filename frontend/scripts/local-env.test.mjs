import { describe, expect, test } from "vitest";

import { buildLocalEnvText, buildSetupSummary } from "./local-env.mjs";

const values = {
  hostOrigin: "http://localhost:3000",
  loginOrigin: "http://localhost:3000",
  rpcUrl: "https://soroban-testnet.stellar.org",
  contractId: "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY",
  sourceAccount: "GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM",
  gateId: "premium-holder",
  gateEpoch: 1,
  credentialRoot: "853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc",
  assetCode: "VPT",
  assetIssuer: "GASSETISSUER",
  minBalance: "1",
  simulatorKey: "simulator-secret",
  issuerSecret: "issuer-secret",
  fixtureCredential: "fixture-secret",
};

describe("local environment setup", () => {
  test("renders a usable ignored .env.local without production database defaults", () => {
    const text = buildLocalEnvText(values);

    expect(text).toContain("NEXT_PUBLIC_VEILPASS_CONTRACT_ID=CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY");
    expect(text).toContain("VEILPASS_CREDENTIAL_ROOT=853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc");
    expect(text).toContain("VEILPASS_ASSET_CODE=VPT");
    expect(text).toContain("VEILPASS_ASSET_ISSUER=GASSETISSUER");
    expect(text).toContain("VEILPASS_ISSUER_SECRET=issuer-secret");
    expect(text).not.toMatch(/^DATABASE_URL=/m);
  });

  test("prints only public setup details", () => {
    const summary = buildSetupSummary({ envPath: "D:/Work/00/Veilpass/frontend/.env.local", funded: true, values });

    expect(summary).toContain(".env.local");
    expect(summary).toContain("GASSETISSUER");
    expect(summary).toContain("CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY");
    expect(summary).not.toContain("issuer-secret");
    expect(summary).not.toContain("simulator-secret");
    expect(summary).not.toContain("fixture-secret");
  });
});
