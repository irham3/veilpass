import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Barretenberg, UltraHonkVerifierBackend } from "@aztec/bb.js";

import { canonicalFieldHex, hashTextToFieldHex, u64ToFieldHex } from "@/packages/shared/src/field";
import type { ProofResult } from "@/packages/shared/src/contracts";

type CircuitArtifact = { bytecode: string };
type ProofArtifacts = { circuit: CircuitArtifact; verificationKey: Uint8Array };
let artifactsPromise: Promise<ProofArtifacts> | undefined;

async function artifacts(): Promise<ProofArtifacts> {
  artifactsPromise ??= Promise.all([
    readFile(join(process.cwd(), "public", "proof", "veilpass_membership.json"), "utf8"),
    readFile(join(process.cwd(), "public", "proof", "veilpass_membership.vk")),
  ]).then(([circuitJson, verificationKey]) => ({ circuit: JSON.parse(circuitJson) as CircuitArtifact, verificationKey: new Uint8Array(verificationKey) }));
  return artifactsPromise;
}

function seconds(isoTime: string): number {
  const milliseconds = Date.parse(isoTime);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error("Invalid proof timestamp");
  return Math.floor(milliseconds / 1_000);
}

function proofBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error("Proof is not base64");
  return Uint8Array.from(Buffer.from(value, "base64"));
}

/** Verifies the received proof against the pinned verification key, not a server HMAC. */
export async function verifyNoirMembershipProof(proofResult: ProofResult): Promise<boolean> {
  try {
    const input = proofResult.publicInputs;
    const [gateIdHash, originHash] = await Promise.all([
      hashTextToFieldHex(`veilpass:gate:${input.gateId}`),
      hashTextToFieldHex(`veilpass:origin:${input.origin}`),
    ]);
    const expected = [
      input.credentialCommitment,
      input.credentialRoot,
      gateIdHash,
      u64ToFieldHex(input.epoch),
      originHash,
      input.challengeHash,
      u64ToFieldHex(seconds(input.proofExpiresAt)),
      u64ToFieldHex(seconds(input.proofCreatedAt)),
      input.privateAppId,
      input.loginNullifier,
      input.revocationHash,
    ].map((value) => `0x${canonicalFieldHex(value)}`);
    const { verificationKey } = await artifacts();
    const api = await Barretenberg.new();
    try {
      return await new UltraHonkVerifierBackend(api).verifyProof({ proof: proofBytes(proofResult.proof), publicInputs: expected, verificationKey });
    } finally {
      await api.destroy();
    }
  } catch {
    return false;
  }
}
