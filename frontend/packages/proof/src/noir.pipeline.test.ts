// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Barretenberg } from "@aztec/bb.js";

const mocks = vi.hoisted(() => {
  const api = { pedersenHash: vi.fn(), destroy: vi.fn() };
  const noir = { init: vi.fn(), execute: vi.fn() };
  const backend = { generateProof: vi.fn() };
  return {
    api,
    noir,
    backend,
    bbNew: vi.fn(async () => api),
    Noir: vi.fn(function Noir() { return noir; }),
    UltraHonkBackend: vi.fn(function UltraHonkBackend() { return backend; }),
  };
});

vi.mock("@noir-lang/noir_js", () => ({ Noir: mocks.Noir }));
vi.mock("@aztec/bb.js", () => ({ Barretenberg: { new: mocks.bbNew }, UltraHonkBackend: mocks.UltraHonkBackend }));

import { canonicalFieldHex, u64ToFieldHex } from "../../shared/src/field";

const mockedApi = mocks.api as unknown as Barretenberg;

const origin = "https://app-a.example";
const credential = {
  gateId: "premium-holder",
  epoch: 3,
  commitment: "01".repeat(32),
  credentialSalt: "02".repeat(32),
  credentialRoot: "03".repeat(32),
  leafIndex: 7,
  leafNonce: "04".repeat(32),
  merklePath: Array.from({ length: 16 }, (_, index) => (index + 5).toString(16).padStart(2, "0").repeat(32)),
  pathIsRight: Array.from({ length: 16 }, (_, index) => index % 2 === 1),
  revocationHash: "06".repeat(32),
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  issuerPublicKey: "GISSUER",
  issuerSignature: "signature",
  subjectSecret: "07".repeat(32),
  storedAt: new Date().toISOString(),
};
const challenge = {
  challengeId: "challenge-unit",
  challenge: Buffer.from("one-time challenge").toString("base64url"),
  origin,
  gateId: "premium-holder",
  expiresAt: new Date(Date.now() + 240_000).toISOString(),
};

function expectedInputs(input: Record<string, string | number | string[] | boolean[]>) {
  return [
    input.credential_commitment,
    input.credential_root,
    input.gate_id_hash,
    u64ToFieldHex(input.epoch as number),
    input.normalized_origin_hash,
    input.challenge_hash,
    u64ToFieldHex(input.proof_expiry as number),
    u64ToFieldHex(input.current_time as number),
    input.private_app_id,
    input.login_nullifier,
    input.revocation_hash,
  ].map((field) => canonicalFieldHex(String(field)));
}

async function loadPipeline() {
  return import("./noir");
}

beforeEach(() => {
  vi.resetModules();
  mocks.api.destroy.mockReset().mockResolvedValue(undefined);
  mocks.api.pedersenHash.mockReset().mockImplementation(async ({ inputs }: { inputs: Uint8Array[] }) => ({ hash: new Uint8Array(32).fill(inputs.length + 5) }));
  mocks.noir.init.mockReset().mockResolvedValue(undefined);
  mocks.noir.execute.mockReset().mockResolvedValue({ witness: "fixture-witness" });
  mocks.backend.generateProof.mockReset().mockImplementation(async () => {
    const input = mocks.noir.execute.mock.calls.at(-1)?.[0] as Record<string, string | number | string[] | boolean[]>;
    return { proof: Uint8Array.from([1, 2, 3, 254]), publicInputs: expectedInputs(input) };
  });
  mocks.bbNew.mockReset().mockResolvedValue(mocks.api);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ bytecode: "fixture-bytecode" }), { status: 200 })));
});

afterEach(() => vi.unstubAllGlobals());

describe("browser Noir proving pipeline", () => {
  it("loads and caches the circuit, binds every public input, and preserves an injected backend", async () => {
    const fetchMock = vi.mocked(fetch);
    const statuses: string[] = [];
    const { proveMembership } = await loadPipeline();
    const first = await proveMembership({ challenge, credential, _api: mockedApi, onStatus: (status) => statuses.push(status) });
    const second = await proveMembership({ challenge, credential, _api: mockedApi });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/proof/veilpass_membership.json", { cache: "force-cache" });
    expect(mocks.Noir).toHaveBeenCalledWith({ bytecode: "fixture-bytecode" });
    expect(mocks.noir.init).toHaveBeenCalledTimes(2);
    expect(mocks.backend.generateProof).toHaveBeenCalledWith("fixture-witness");
    expect(first).toMatchObject({ challengeId: "challenge-unit", proof: "AQID/g==", publicInputs: { gateId: "premium-holder", origin, epoch: 3 } });
    expect(second.challengeId).toBe("challenge-unit");
    expect(statuses).toEqual([
      "Loading the pinned membership circuit",
      "Initializing the local proving engine",
      "Creating the membership proof locally",
    ]);
    expect(mocks.api.destroy).not.toHaveBeenCalled();
  });

  it("rejects a missing circuit artifact and does not cache it as a successful proof", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("missing", { status: 404 }));
    const { proveMembership } = await loadPipeline();
    await expect(proveMembership({ challenge, credential, _api: mockedApi })).rejects.toThrow("pinned VeilPass circuit artifact is unavailable");
    expect(mocks.api.pedersenHash).not.toHaveBeenCalled();
    expect(mocks.backend.generateProof).not.toHaveBeenCalled();
  });

  it("rejects expired inputs before loading circuit or starting the prover", async () => {
    const { proveMembership } = await loadPipeline();
    await expect(proveMembership({
      challenge: { ...challenge, expiresAt: new Date(Date.now() - 1).toISOString() },
      credential,
      _api: mockedApi,
    })).rejects.toThrow("credential or login challenge has expired");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed timestamps when encoding the circuit inputs", async () => {
    const { proveMembership } = await loadPipeline();
    await expect(proveMembership({
      challenge: { ...challenge, expiresAt: "not-a-timestamp" },
      credential,
      _api: mockedApi,
    })).rejects.toThrow("Invalid time value");
    expect(mocks.backend.generateProof).not.toHaveBeenCalled();
  });

  it("rejects backend public-input drift and releases an internally owned proving backend", async () => {
    mocks.backend.generateProof.mockResolvedValueOnce({ proof: new Uint8Array([1]), publicInputs: ["00"] });
    const { proveMembership } = await loadPipeline();
    await expect(proveMembership({ challenge, credential })).rejects.toThrow("public inputs did not match");
    expect(mocks.bbNew).toHaveBeenCalledOnce();
    expect(mocks.api.destroy).toHaveBeenCalledOnce();
  });

  it("destroys its backend after proof-generation failures and creates a commitment with fresh browser secrets", async () => {
    mocks.noir.execute.mockRejectedValueOnce(new Error("witness failed"));
    const { createCredentialSecrets, proveMembership } = await loadPipeline();
    await expect(proveMembership({ challenge, credential })).rejects.toThrow("witness failed");
    expect(mocks.api.destroy).toHaveBeenCalledOnce();

    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.fill(getRandomValues.mock.calls.length + 1);
      return bytes;
    });
    vi.stubGlobal("crypto", { getRandomValues });
    const secrets = await createCredentialSecrets();
    expect(secrets.subjectSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(secrets.credentialSalt).toMatch(/^[a-f0-9]{64}$/);
    expect(secrets.commitment).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.bbNew).toHaveBeenCalledWith({ skipSrsInit: true });
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });
});
