import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Barretenberg, UltraHonkVerifierBackend } from "@aztec/bb.js";

import { canonicalFieldHex, hashTextToFieldHex, u64ToFieldHex } from "@/packages/shared/src/field";
import type { ProofResult } from "@/packages/shared/src/contracts";

type CircuitArtifact = { bytecode: string };
type ProofArtifacts = { circuit: CircuitArtifact; verificationKey: Uint8Array };
let cachedArtifacts: ProofArtifacts | undefined;

async function readArtifactFile(filename: string): Promise<Buffer> {
  const candidatePaths = [
    join(process.cwd(), "public", "proof", filename),
    join(process.cwd(), "frontend", "public", "proof", filename),
  ];
  for (const candidate of candidatePaths) {
    try {
      return await readFile(candidate);
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Circuit artifact ${filename} could not be found in ${candidatePaths.join(" or ")}`);
}

async function artifacts(): Promise<ProofArtifacts> {
  if (cachedArtifacts) return cachedArtifacts;
  try {
    const [circuitBuffer, verificationKeyBuffer] = await Promise.all([
      readArtifactFile("veilpass_membership.json"),
      readArtifactFile("veilpass_membership.vk"),
    ]);
    cachedArtifacts = {
      circuit: JSON.parse(circuitBuffer.toString("utf8")) as CircuitArtifact,
      verificationKey: new Uint8Array(verificationKeyBuffer),
    };
    return cachedArtifacts;
  } catch (error) {
    console.error("[zk-verifier] Failed to load circuit artifacts:", error);
    throw error;
  }
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
  } catch (error) {
    console.error("[zk-verifier] Noir verification failed:", error);
    return false;
  }
}
