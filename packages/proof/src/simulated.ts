import { createHmac, timingSafeEqual } from "node:crypto";

import { proofResultSchema, type ProofResult, type PublicInputs } from "../../shared/src/contracts";

const prefix = "simulated-v1.";

export function createSimulatedProof({ challengeId, publicInputs, key }: { challengeId: string; publicInputs: PublicInputs; key: string }): ProofResult {
  const signature = createHmac("sha256", key).update(canonical(challengeId, publicInputs)).digest("base64url");
  return proofResultSchema.parse({ challengeId, publicInputs, proof: `${prefix}${signature}` });
}

export function verifySimulatedProof({ proofResult, key }: { proofResult: ProofResult; key: string }): boolean {
  if (!proofResult.proof.startsWith(prefix)) return false;
  const actual = Buffer.from(proofResult.proof.slice(prefix.length));
  const expected = Buffer.from(createHmac("sha256", key).update(canonical(proofResult.challengeId, proofResult.publicInputs)).digest("base64url"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function canonical(challengeId: string, input: PublicInputs): string {
  return JSON.stringify([challengeId, input.gateId, input.epoch, input.origin, input.challengeHash, input.credentialRoot, input.privateAppId, input.loginNullifier, input.revocationHash, input.proofExpiresAt]);
}
