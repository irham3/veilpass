import { Keypair } from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { readGateState, updateRoot, signAndSend, clientOptions } = vi.hoisted(() => ({
  readGateState: vi.fn(),
  updateRoot: vi.fn(),
  signAndSend: vi.fn(),
  clientOptions: vi.fn(),
}));
vi.mock("@/packages/shared/src/contract", () => ({ readGateState }));
vi.mock("@/packages/contract-bindings/src", () => ({ Client: class { constructor(options: unknown) { clientOptions(options); } update_root = updateRoot; } }));

import { publishCredentialRoot } from "./root-publisher";

const owner = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9));
const root = "1".repeat(64);
const initialRoot = "0".repeat(64);
const input = { gateId: "premium-holder", expectedEpoch: 1, newRoot: root };
const state = (credentialRoot: string, epoch = 1, publicKey = owner.publicKey()) => ({
  owner: publicKey,
  epoch,
  credential_root: Buffer.from(credentialRoot, "hex"),
});

beforeEach(() => {
  vi.stubEnv("VEILPASS_GATE_OWNER_SECRET", owner.secret());
  vi.stubEnv("NEXT_PUBLIC_VEILPASS_CONTRACT_ID", "CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK");
  readGateState.mockReset().mockResolvedValueOnce(state(initialRoot)).mockResolvedValueOnce(state(root));
  updateRoot.mockReset().mockImplementation(() => ({ signAndSend }));
  signAndSend.mockReset().mockResolvedValue({ result: { isErr: () => false } });
  clientOptions.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("gate root publisher", () => {
  it("publishes and confirms the exact proposed root at the expected epoch", async () => {
    await publishCredentialRoot(input);
    expect(updateRoot).toHaveBeenCalledWith({
      owner: owner.publicKey(), gate_id: input.gateId, expected_epoch: 1, new_root: Buffer.from(root, "hex"),
    });
    expect(clientOptions).toHaveBeenCalledWith(expect.objectContaining({ contractId: process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID, publicKey: owner.publicKey() }));
    expect(readGateState).toHaveBeenCalledTimes(2);
  });

  it("does not send a transaction when config, ownership, or epoch is wrong", async () => {
    vi.stubEnv("VEILPASS_GATE_OWNER_SECRET", "");
    await expect(publishCredentialRoot(input)).rejects.toThrow("not configured");
    vi.stubEnv("VEILPASS_GATE_OWNER_SECRET", owner.secret());

    readGateState.mockReset().mockResolvedValue(state(initialRoot, 1, Keypair.fromRawEd25519Seed(Buffer.alloc(32, 10)).publicKey()));
    await expect(publishCredentialRoot(input)).rejects.toThrow("does not own");

    readGateState.mockReset().mockResolvedValue(state(initialRoot, 2));
    await expect(publishCredentialRoot(input)).rejects.toThrow("epoch changed");
    expect(updateRoot).not.toHaveBeenCalled();
  });

  it("rejects an unsuccessful transaction or unconfirmed on-chain state", async () => {
    signAndSend.mockResolvedValueOnce({ result: { isErr: () => true, unwrapErr: () => new Error("rejected") } });
    await expect(publishCredentialRoot(input)).rejects.toThrow("Gate root update was rejected");

    readGateState.mockReset().mockResolvedValueOnce(state(initialRoot)).mockResolvedValueOnce(state(initialRoot));
    await expect(publishCredentialRoot(input)).rejects.toThrow("was not confirmed");
  });
});
