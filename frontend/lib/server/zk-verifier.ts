import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Barretenberg, UltraHonkVerifierBackend } from "@aztec/bb.js";

import { canonicalFieldHex, hashTextToFieldHex, u64ToFieldHex } from "@/packages/shared/src/field";
import type { ProofResult } from "@/packages/shared/src/contracts";

type CircuitArtifact = { bytecode: string };
type ProofArtifacts = { circuit: CircuitArtifact; verificationKey: Uint8Array };
let cachedArtifacts: ProofArtifacts | undefined;

export function resolveVerifierCrsPath(environment: Readonly<Record<string, string | undefined>> = process.env): string | undefined {
  return environment.CRS_PATH ?? (environment.VERCEL ? "/tmp/veilpass-bb-crs" : undefined);
}

async function artifacts(): Promise<ProofArtifacts> {
  if (cachedArtifacts) return cachedArtifacts;
  try {
    const [circuitBuffer, verificationKeyBuffer] = await Promise.all([
      readFile(join(process.cwd(), "public", "proof", "veilpass_membership.json"))
        .catch(() => readFile(join(process.cwd(), "frontend", "public", "proof", "veilpass_membership.json"))),
      readFile(join(process.cwd(), "public", "proof", "veilpass_membership.vk"))
        .catch(() => readFile(join(process.cwd(), "frontend", "public", "proof", "veilpass_membership.vk"))),
    ]);
    cachedArtifacts = {
      circuit: JSON.parse(circuitBuffer.toString("utf8")) as CircuitArtifact,
      verificationKey: new Uint8Array(verificationKeyBuffer),
    };
    return cachedArtifacts;
  } catch (error) {
    console.error(JSON.stringify({ event: "zk_artifacts_unavailable", reason: error instanceof Error ? error.name : "unknown" }));
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
  let stage = "derive_public_inputs";
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
    stage = "load_verification_key";
    const { verificationKey } = await artifacts();
    stage = "initialize_verifier";
    // Vercel functions only guarantee a writable temporary directory. The
    // library defaults its CRS cache to the home directory, which can be
    // read-only in production and makes cold-start verification fail.
    const crsPath = resolveVerifierCrsPath();
    const api = await Barretenberg.new({ crsPath });
    try {
      stage = "verify_proof";
      return await new UltraHonkVerifierBackend(api).verifyProof({ proof: proofBytes(proofResult.proof), publicInputs: expected, verificationKey });
    } finally {
      await api.destroy();
    }
  } catch (error) {
    console.error(JSON.stringify({ event: "noir_verification_failed", stage, reason: error instanceof Error ? error.name : "unknown" }));
    return false;
  }
}
