import { describe, expect, it } from "vitest";

import { inspectRuntimeConfiguration } from "./runtime-config";

const complete = {
  DATABASE_URL: "postgresql://veilpass:password@db.example.test:5432/veilpass?sslmode=require",
  VEILPASS_HOST_ORIGIN: "https://app-a.example.test",
  VEILPASS_LOGIN_ORIGIN: "https://login.example.test",
  NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN: "https://login.example.test",
  NEXT_PUBLIC_VEILPASS_CONTRACT_ID: "CCONTRACT",
  NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT: "GSOURCE",
  VEILPASS_GATE_IDS: "premium-holder",
  VEILPASS_ASSET_CODE: "VPT",
  VEILPASS_ASSET_ISSUER: "GISSUER",
  VEILPASS_MIN_BALANCE: "1",
  VEILPASS_ISSUER_SECRET: "SISSUER",
  VEILPASS_GATE_OWNER_SECRET: "SOWNER",
};

describe("runtime configuration inspection", () => {
  it("reports a complete configuration without returning its values", () => {
    expect(inspectRuntimeConfiguration(complete)).toEqual({
      ok: true,
      issues: [],
      checks: {
        database: true,
        hostOrigin: true,
        loginOrigin: true,
        publicLoginOrigin: true,
        contractId: true,
        sourceAccount: true,
        gateIds: true,
        assetRule: true,
        issuerSecret: true,
        gateOwnerSecret: true,
      },
    });
  });

  it("identifies malformed origins and a malformed database URL", () => {
    const report = inspectRuntimeConfiguration({ ...complete, DATABASE_URL: "postgresql://", VEILPASS_LOGIN_ORIGIN: "https://login.example.test/path" });
    expect(report.ok).toBe(false);
    expect(report.issues).toContain("DATABASE_URL_INVALID");
    expect(report.issues).toContain("LOGIN_ORIGIN_INVALID");
    expect(JSON.stringify(report)).not.toContain("password");
  });

  it("accepts an explicit, unique host-origin allowlist for the two-dApp deployment", () => {
    const report = inspectRuntimeConfiguration({
      ...complete,
      VEILPASS_HOST_ORIGIN: "https://app-a.example.test, https://app-b.example.test",
    });
    expect(report.ok).toBe(true);
    expect(report.checks.hostOrigin).toBe(true);
  });

  it("rejects empty, malformed, or duplicate entries in a host-origin allowlist", () => {
    expect(inspectRuntimeConfiguration({ ...complete, VEILPASS_HOST_ORIGIN: "https://app-a.example.test,,https://app-b.example.test" }).checks.hostOrigin).toBe(false);
    expect(inspectRuntimeConfiguration({ ...complete, VEILPASS_HOST_ORIGIN: "https://app-a.example.test, not-an-origin" }).checks.hostOrigin).toBe(false);
    expect(inspectRuntimeConfiguration({ ...complete, VEILPASS_HOST_ORIGIN: "https://app-a.example.test, https://app-a.example.test" }).checks.hostOrigin).toBe(false);
  });
});
