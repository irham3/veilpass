import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(), newBackend: vi.fn(), verifyProof: vi.fn(), destroy: vi.fn(),
  canonicalFieldHex: vi.fn((value: string) => value),
  hashTextToFieldHex: vi.fn(async () => "1".repeat(64)),
  u64ToFieldHex: vi.fn(() => "2".repeat(64)),
}));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("@aztec/bb.js", () => ({
  Barretenberg: { new: mocks.newBackend },
  UltraHonkVerifierBackend: class { verifyProof = mocks.verifyProof; constructor(readonly api: unknown) {} },
}));
vi.mock("@/packages/shared/src/field", () => ({
  canonicalFieldHex: mocks.canonicalFieldHex,
  hashTextToFieldHex: mocks.hashTextToFieldHex,
  u64ToFieldHex: mocks.u64ToFieldHex,
}));

afterEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
});

async function verify(proof = proofResult) {
  return (await import("./zk-verifier")).verifyNoirMembershipProof(proof);
}

const proofResult = {
  challengeId: "challenge-1", proof: "AQ==",
  publicInputs: {
    gateId: "premium-holder", epoch: 1, origin: "https://app.example", challengeHash: "3".repeat(64),
    credentialCommitment: "4".repeat(64), credentialRoot: "5".repeat(64), privateAppId: "6".repeat(64),
    loginNullifier: "7".repeat(64), revocationHash: "8".repeat(64),
    proofCreatedAt: "2026-09-29T00:00:00.000Z", proofExpiresAt: "2026-09-29T00:01:00.000Z",
  },
};

describe("Noir verifier failure containment", () => {
  it("verifies a well-formed proof, caches artifacts, and destroys the backend", async () => {
    mocks.readFile.mockImplementation(async (path: string) => String(path).endsWith(".json") ? Buffer.from('{"bytecode":"circuit"}') : Buffer.from([1, 2, 3]));
    mocks.newBackend.mockResolvedValue({ destroy: mocks.destroy });
    mocks.verifyProof.mockResolvedValue(true);
    await expect(verify(proofResult)).resolves.toBe(true);
    await expect(verify(proofResult)).resolves.toBe(true);
    expect(mocks.readFile).toHaveBeenCalledTimes(2);
    expect(mocks.verifyProof).toHaveBeenCalledWith(expect.objectContaining({ proof: new Uint8Array([1]), verificationKey: new Uint8Array([1, 2, 3]) }));
    expect(mocks.destroy).toHaveBeenCalledTimes(2);
  });

  it("contains invalid proof timestamps and malformed base64", async () => {
    mocks.readFile.mockImplementation(async (path: string) => String(path).endsWith(".json") ? Buffer.from('{"bytecode":"circuit"}') : Buffer.from([1]));
    mocks.newBackend.mockResolvedValue({ destroy: mocks.destroy });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(verify({ ...proofResult, publicInputs: { ...proofResult.publicInputs, proofCreatedAt: "invalid" } })).resolves.toBe(false);
    await expect(verify({ ...proofResult, proof: "not-base64" })).resolves.toBe(false);
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("returns false when pinned proof artifacts or backend initialization fail", async () => {
    mocks.readFile.mockRejectedValue(new Error("missing artifact"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(verify(proofResult)).resolves.toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"stage":"load_verification_key"'));

    mocks.readFile.mockRejectedValue("artifact unavailable");
    await expect(verify(proofResult)).resolves.toBe(false);
    expect(error).toHaveBeenLastCalledWith(expect.stringContaining('"reason":"unknown"'));

    mocks.readFile.mockImplementation(async (path: string) => String(path).endsWith(".json") ? Buffer.from('{"bytecode":"circuit"}') : Buffer.from([1]));
    mocks.newBackend.mockRejectedValueOnce("backend unavailable");
    await expect(verify(proofResult)).resolves.toBe(false);
    expect(error).toHaveBeenLastCalledWith(expect.stringContaining('"stage":"initialize_verifier"'));
  });

  it("returns false when the pinned verifier throws and still releases its backend", async () => {
    mocks.readFile.mockImplementation(async (path: string) => String(path).endsWith(".json") ? Buffer.from('{"bytecode":"circuit"}') : Buffer.from([1]));
    mocks.newBackend.mockResolvedValue({ destroy: mocks.destroy });
    mocks.verifyProof.mockRejectedValue(new Error("invalid proof"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(verify(proofResult)).resolves.toBe(false);
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
