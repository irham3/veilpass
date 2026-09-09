import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Barretenberg, UltraHonkBackend, UltraHonkVerifierBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { describe, expect, it } from "vitest";

import { fieldHexFromBytes, fieldHexToNoir, hashBytesToFieldHex, hashTextToFieldHex, u64ToFieldHex } from "@/packages/shared/src/field";
import { verifyNoirMembershipProof } from "./zk-verifier";

function fieldBytes(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
}

function seconds(iso: string): number { return Math.floor(Date.parse(iso) / 1_000); }

describe("pinned Noir verifier", () => {
  it("accepts a locally generated proof only when its semantic public inputs match", async () => {
    const circuit = JSON.parse(await readFile(join(process.cwd(), "public", "proof", "veilpass_membership.json"), "utf8")) as { bytecode: string };
    const api = await Barretenberg.new();
    try {
      const hash = async (inputs: string[]) => fieldHexFromBytes((await api.pedersenHash({ inputs: inputs.map(fieldBytes), hashIndex: 0 })).hash);
      const now = Date.now();
      const proofCreatedAt = new Date(now).toISOString();
      const proofExpiresAt = new Date(now + 120_000).toISOString();
      const credentialExpiresAt = new Date(now + 300_000).toISOString();
      const subjectSecret = "01".padStart(64, "0");
      const credentialSalt = "07".padStart(64, "0");
      const gateId = "premium-holder";
      const origin = "http://app-a.localhost:3000";
      const rawChallenge = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
      const gateIdHash = await hashTextToFieldHex(`veilpass:gate:${gateId}`);
      const originHash = await hashTextToFieldHex(`veilpass:origin:${origin}`);
      const challengeHash = await hashBytesToFieldHex(rawChallenge);
      const commitment = await hash([subjectSecret, credentialSalt]);
      const leafNonce = "04".padStart(64, "0");
      const revocationHash = "09".padStart(64, "0");
      const epoch = 1;
      const expiry = seconds(credentialExpiresAt);
      let root = await hash([commitment, gateIdHash, "01".padStart(64, "0"), fieldHexFromBytes(numberBytes(expiry)), leafNonce, revocationHash]);
      for (let index = 0; index < 16; index += 1) root = await hash([root, "00".repeat(32)]);
      const privateAppId = await hash([subjectSecret, gateIdHash, originHash]);
      const loginNullifier = await hash([subjectSecret, challengeHash]);
      const noir = new Noir(circuit as never);
      await noir.init();
      const execution = await noir.execute({
        subject_secret: fieldHexToNoir(subjectSecret), credential_salt: fieldHexToNoir(credentialSalt), credential_expiry: expiry, leaf_nonce: fieldHexToNoir(leafNonce), merkle_path: Array.from({ length: 16 }, () => fieldHexToNoir("00".repeat(32))), path_is_right: Array.from({ length: 16 }, () => false), credential_commitment: fieldHexToNoir(commitment), credential_root: fieldHexToNoir(root), gate_id_hash: fieldHexToNoir(gateIdHash), epoch, normalized_origin_hash: fieldHexToNoir(originHash), challenge_hash: fieldHexToNoir(challengeHash), proof_expiry: seconds(proofExpiresAt), current_time: seconds(proofCreatedAt), private_app_id: fieldHexToNoir(privateAppId), login_nullifier: fieldHexToNoir(loginNullifier), revocation_hash: fieldHexToNoir(revocationHash),
      });
      const generated = await new UltraHonkBackend(circuit.bytecode, api).generateProof(execution.witness);
      const verificationKey = new Uint8Array(await readFile(join(process.cwd(), "public", "proof", "veilpass_membership.vk")));
      expect(await new UltraHonkVerifierBackend(api).verifyProof({ ...generated, verificationKey })).toBe(true);
      const expected = [commitment, root, gateIdHash, u64ToFieldHex(epoch), originHash, challengeHash, u64ToFieldHex(seconds(proofExpiresAt)), u64ToFieldHex(seconds(proofCreatedAt)), privateAppId, loginNullifier, revocationHash];
      expect(generated.publicInputs).toEqual(expected.map((value) => `0x${value}`));
      const proofResult = {
        challengeId: "proof-fixture",
        proof: Buffer.from(generated.proof).toString("base64"),
        publicInputs: { gateId, epoch, origin, challengeHash, credentialCommitment: commitment, credentialRoot: root, privateAppId, loginNullifier, revocationHash, proofCreatedAt, proofExpiresAt },
      };
      await expect(verifyNoirMembershipProof(proofResult)).resolves.toBe(true);
      await expect(verifyNoirMembershipProof({ ...proofResult, publicInputs: { ...proofResult.publicInputs, origin: "http://app-b.localhost:3000" } })).resolves.toBe(false);
    } finally {
      await api.destroy();
    }
  }, 60_000);
});

function numberBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(32);
  let remaining = value;
  for (let index = 31; index >= 0 && remaining > 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return bytes;
}
