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
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
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

  it("uses safe defaults when local policy fields are omitted", async () => {
    delete process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT;
    delete process.env.VEILPASS_GATE_REVOKED;
    delete process.env.VEILPASS_GATE_EPOCH;
    delete process.env.VEILPASS_CREDENTIAL_ROOT;
    await expect(getGatePolicy()).resolves.toEqual({ active: true, epoch: 1, credentialRoot: "testnet-root-v1" });
  });
});
