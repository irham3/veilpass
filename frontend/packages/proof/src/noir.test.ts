// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Barretenberg } from "@aztec/bb.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fieldHexFromBytes, hashTextToFieldHex } from "../../shared/src/field";
import { createCredentialSecrets, proveMembership } from "./noir";
import { verifyNoirMembershipProof } from "../../../lib/server/zk-verifier";

function bytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
}

function numberBytes(value: number) {
  const result = new Uint8Array(32);
  let remaining = value;
  for (let index = 31; index >= 0 && remaining > 0; index -= 1) {
    result[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return result;
}

afterEach(() => vi.unstubAllGlobals());

describe("browser credential commitment", () => {
  it("binds two fresh browser secrets with the pinned Pedersen hash", async () => {
    const first = await createCredentialSecrets();
    const second = await createCredentialSecrets();
    expect(first.subjectSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(first.credentialSalt).toMatch(/^[a-f0-9]{64}$/);
    expect(first.commitment).toMatch(/^[a-f0-9]{64}$/);
    expect(first.subjectSecret).not.toBe(second.subjectSecret);
    expect(first.commitment).not.toBe(second.commitment);

    const api = await Barretenberg.new({ skipSrsInit: true });
    try {
      const hash = await api.pedersenHash({ inputs: [bytes(first.subjectSecret), bytes(first.credentialSalt)], hashIndex: 0 });
      expect(first.commitment).toBe(Buffer.from(hash.hash).toString("hex"));
    } finally {
      await api.destroy();
    }
  }, 60_000);

  // Full UltraHonk prove + verify is covered by lib/server/zk-verifier.test.ts (Node env).
  // jsdom cannot load the SharedArrayBuffer/worker-dependent WASM backend for proof generation.
  // These tests verify the proveMembership API contract: expiry guards fire BEFORE touching WASM,
  // and verifyNoirMembershipProof safely rejects structurally invalid proofs.
  it("throws before touching WASM when challenge or credential is expired", async () => {
    const circuit = await readFile(join(process.cwd(), "public", "proof", "veilpass_membership.json"), "utf8");
    const nativeFetch = globalThis.fetch.bind(globalThis);
    vi.stubGlobal("fetch", vi.fn((resource: RequestInfo | URL, init?: RequestInit) =>
      String(resource) === "/proof/veilpass_membership.json"
        ? Promise.resolve(new Response(circuit, { status: 200 }))
        : nativeFetch(resource, init)));

    const gateId = "premium-holder";
    const origin = "https://app-a.example";
    const subjectSecret = "01".padStart(64, "0");
    const credentialSalt = "07".padStart(64, "0");
    const leafNonce = "04".padStart(64, "0");
    const revocationHash = "09".padStart(64, "0");
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    const gateIdHash = await hashTextToFieldHex(`veilpass:gate:${gateId}`);

    const api = await Barretenberg.new({ skipSrsInit: true });
    let commitment: string;
    let root: string;
    try {
      const hash = async (inputs: string[]) => fieldHexFromBytes((await api.pedersenHash({ inputs: inputs.map(bytes), hashIndex: 0 })).hash);
      commitment = await hash([subjectSecret, credentialSalt]);
      root = await hash([commitment, gateIdHash, "01".padStart(64, "0"), fieldHexFromBytes(numberBytes(Math.floor(Date.parse(expiresAt) / 1000))), leafNonce, revocationHash]);
      for (let index = 0; index < 16; index += 1) root = await hash([root, "00".repeat(32)]);
    } finally {
      await api.destroy();
    }

    const baseCredential = {
      gateId, epoch: 1, commitment, credentialSalt, credentialRoot: root, leafIndex: 0, leafNonce,
      merklePath: Array.from({ length: 16 }, () => "00".repeat(32)),
      pathIsRight: Array.from({ length: 16 }, () => false),
      revocationHash, expiresAt, issuerPublicKey: "test-issuer", issuerSignature: "test-signature",
      subjectSecret, storedAt: new Date().toISOString(),
    };

    // Expired challenge must be rejected before any WASM call
    await expect(proveMembership({
      challenge: {
        challengeId: "expired-ch",
        challenge: Buffer.from(new Uint8Array(32)).toString("base64url"),
        origin, gateId,
        expiresAt: new Date(Date.now() - 1).toISOString(),
      },
      credential: baseCredential,
    })).rejects.toThrow("expired");

    // Expired credential must be rejected before any WASM call
    await expect(proveMembership({
      challenge: {
        challengeId: "valid-ch",
        challenge: Buffer.from(new Uint8Array(32)).toString("base64url"),
        origin, gateId,
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      },
      credential: { ...baseCredential, expiresAt: new Date(Date.now() - 1).toISOString() },
    })).rejects.toThrow("expired");
  }, 30_000);

  it("verifier safely returns false for a structurally invalid proof without crashing", async () => {
    // This confirms verifyNoirMembershipProof wraps errors as false rather than throwing,
    // which is the contract the /api/verify route depends on.
    await expect(verifyNoirMembershipProof({
      challengeId: "bad-proof",
      proof: Buffer.from("this-is-not-a-real-proof").toString("base64"),
      publicInputs: {
        gateId: "premium-holder",
        epoch: 1,
        origin: "https://app-a.example",
        challengeHash: "00".repeat(32),
        credentialCommitment: "00".repeat(32),
        credentialRoot: "00".repeat(32),
        privateAppId: "00".repeat(32),
        loginNullifier: "00".repeat(32),
        revocationHash: "00".repeat(32),
        proofCreatedAt: new Date().toISOString(),
        proofExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    })).resolves.toBe(false);
  }, 30_000);
});
