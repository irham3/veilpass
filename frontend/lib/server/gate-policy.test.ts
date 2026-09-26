import { afterEach, describe, expect, it, vi } from "vitest";

const { readGateState, readRevocationState } = vi.hoisted(() => ({ readGateState: vi.fn(), readRevocationState: vi.fn() }));
vi.mock("@/packages/shared/src/contract", () => ({ readGateState, readRevocationState }));

import { getGatePolicy, isAllowedGate } from "./gate-policy";

const environmentKeys = [
  "VEILPASS_GATE_IDS",
  "NEXT_PUBLIC_VEILPASS_CONTRACT_ID",
  "NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT",
  "VEILPASS_GATE_REVOKED",
  "VEILPASS_GATE_EPOCH",
  "VEILPASS_CREDENTIAL_ROOT",
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  readGateState.mockReset();
  readRevocationState.mockReset();
});

describe("gate allowlist", () => {
  it("matches complete, trimmed identifiers without substring fallthrough", () => {
    process.env.VEILPASS_GATE_IDS = " premium-holder, staff-holder ";

    expect(isAllowedGate("premium-holder")).toBe(true);
    expect(isAllowedGate("staff-holder")).toBe(true);
    expect(isAllowedGate("premium")).toBe(false);
    expect(isAllowedGate("premium-holder,staff-holder")).toBe(false);
  });

  it("defaults to the documented gate when configuration is absent", () => {
    delete process.env.VEILPASS_GATE_IDS;

    expect(isAllowedGate("premium-holder")).toBe(true);
    expect(isAllowedGate("")).toBe(false);
  });

  it("builds a deterministic local policy and honors explicit revocation", async () => {
    delete process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT;
    process.env.VEILPASS_GATE_REVOKED = "true";
    process.env.VEILPASS_GATE_EPOCH = "7";
    process.env.VEILPASS_CREDENTIAL_ROOT = "local-root";

    await expect(getGatePolicy("premium-holder")).resolves.toEqual({
      active: false,
      epoch: 7,
      credentialRoot: "local-root",
    });
  });

  it("reads the live contract policy and exposes revocation checks", async () => {
    process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID = "CCONTRACT";
    process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT = "GSOURCE";
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://rpc.example";
    readGateState.mockResolvedValue({ epoch: 9, owner: "GOWNER", credential_root: Uint8Array.from([1, 2, 3]) });
    readRevocationState.mockResolvedValue(true);

    const policy = await getGatePolicy("staff-holder");
    expect(policy).toMatchObject({ active: true, epoch: 9, owner: "GOWNER", credentialRoot: "010203" });
    await expect(policy.isRevoked?.("deadbeef")).resolves.toBe(true);
    expect(readGateState).toHaveBeenCalledWith({ contractId: "CCONTRACT", gateId: "staff-holder", rpcUrl: "https://rpc.example", sourceAccount: "GSOURCE" });
    expect(readRevocationState).toHaveBeenCalledWith({ contractId: "CCONTRACT", gateId: "staff-holder", revocationHash: "deadbeef", rpcUrl: "https://rpc.example", sourceAccount: "GSOURCE" });
  });

  it("fails closed when revocation state cannot be read", async () => {
    process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID = "CCONTRACT";
    process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT = "GSOURCE";
    readGateState.mockResolvedValue({ epoch: 1, owner: "GOWNER", credential_root: Uint8Array.from([1]) });
    readRevocationState.mockRejectedValue(new Error("RPC timeout"));

    const policy = await getGatePolicy("premium-holder");
    await expect(policy.isRevoked?.("deadbeef")).rejects.toThrow("RPC timeout");
  });

  it("falls back to configured credential root when live readGateState fails", async () => {
    process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID = "CCONTRACT";
    process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT = "GSOURCE";
    process.env.VEILPASS_CREDENTIAL_ROOT = "fallback-root";
    process.env.VEILPASS_GATE_EPOCH = "3";
    readGateState.mockRejectedValue(new Error("RPC down"));

    const policy = await getGatePolicy("premium-holder");
    expect(policy).toEqual({
      active: true,
      epoch: 3,
      credentialRoot: "fallback-root",
    });
  });

  it("rethrows error when live readGateState fails and no credential root is configured", async () => {
    process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID = "CCONTRACT";
    process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT = "GSOURCE";
    delete process.env.VEILPASS_CREDENTIAL_ROOT;
    readGateState.mockRejectedValue(new Error("Fatal RPC error"));

    await expect(getGatePolicy("premium-holder")).rejects.toThrow("Fatal RPC error");
  });

  it("never uses a stale fallback root in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID = "CCONTRACT";
    process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT = "GSOURCE";
    process.env.VEILPASS_CREDENTIAL_ROOT = "stale-root";
    readGateState.mockRejectedValue(new Error("Invalid contract StrKey checksum"));

    await expect(getGatePolicy("premium-holder")).rejects.toThrow("Invalid contract StrKey checksum");
  });

  it("redacts non-Error failures from the live contract adapter", async () => {
    process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID = "CCONTRACT";
    process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT = "GSOURCE";
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    readGateState.mockResolvedValue({ epoch: 1, owner: "GOWNER", credential_root: Uint8Array.from([1]) });
    readRevocationState.mockRejectedValueOnce("private adapter detail");
    const policy = await getGatePolicy("premium-holder");
    await expect(policy.isRevoked?.("hash")).rejects.toBe("private adapter detail");
    expect(error.mock.calls.join(" ")).toContain('"reason":"unknown"');

    process.env.VEILPASS_CREDENTIAL_ROOT = "fallback-root";
    readGateState.mockRejectedValueOnce("private RPC detail");
    await expect(getGatePolicy("premium-holder")).resolves.toEqual({ active: true, epoch: 1, credentialRoot: "fallback-root" });
    expect(warn.mock.calls.join(" ")).toContain('"reason":"unknown"');
    expect(JSON.stringify([...error.mock.calls, ...warn.mock.calls])).not.toContain("private");
  });

  it("requires a live contract binding in production even when a fallback root exists", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT;
    process.env.VEILPASS_CREDENTIAL_ROOT = "stale-root";

    await expect(getGatePolicy("premium-holder")).rejects.toThrow("Live gate configuration is required in production");
  });

  it("uses safe defaults when local policy fields are omitted", async () => {
    delete process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT;
    delete process.env.VEILPASS_GATE_REVOKED;
    delete process.env.VEILPASS_GATE_EPOCH;
    delete process.env.VEILPASS_CREDENTIAL_ROOT;
    await expect(getGatePolicy()).resolves.toEqual({ active: true, epoch: 1, credentialRoot: "testnet-root-v1" });
  });
});
