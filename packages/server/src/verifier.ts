import "server-only";

import type { ChallengeStore } from "@/lib/server/challenge-store";
import { normalizeOrigin } from "@/packages/shared/src/origin";
import { proofResultSchema, type ProofResult, type VerifyResult, type VeilPassErrorCode } from "@/packages/shared/src/contracts";
import { verifySimulatedProof } from "@/packages/proof/src/simulated";

export type GatePolicy = { active: boolean; epoch: number; credentialRoot: string; revocationHash: string };

export async function verifyVeilPassProof({ proofResult, expectedOrigin, expectedGateId, store, policy, key, now = Date.now, requestId }: { proofResult: unknown; expectedOrigin: string; expectedGateId: string; store: ChallengeStore; policy: GatePolicy; key: string; now?: () => number; requestId: string }): Promise<VerifyResult> {
  const parsed = proofResultSchema.safeParse(proofResult);
  if (!parsed.success) return failure("PROOF_INVALID", requestId);
  const result: ProofResult = parsed.data;
  const input = result.publicInputs;
  let normalizedExpected: string;
  try { normalizedExpected = normalizeOrigin(expectedOrigin); } catch { return failure("ORIGIN_MISMATCH", requestId); }
  if (input.origin !== normalizedExpected) return failure("ORIGIN_MISMATCH", requestId);
  if (input.gateId !== expectedGateId) return failure("GATE_MISMATCH", requestId);
  if (Date.parse(input.proofExpiresAt) <= now()) return failure("CREDENTIAL_EXPIRED", requestId);
  if (!policy.active) return failure("CREDENTIAL_REVOKED", requestId);
  if (input.epoch !== policy.epoch) return failure("STALE_EPOCH", requestId);
  if (input.credentialRoot !== policy.credentialRoot) return failure("PROOF_INVALID", requestId);
  if (input.revocationHash !== policy.revocationHash) return failure("CREDENTIAL_REVOKED", requestId);
  if (!verifySimulatedProof({ proofResult: result, key })) return failure("PROOF_INVALID", requestId);
  const consumed = await store.consume({ challengeId: result.challengeId, challengeHash: input.challengeHash, gateId: input.gateId, origin: input.origin, loginNullifier: input.loginNullifier });
  if (!consumed.ok) return failure(consumed.error, requestId);
  return { ok: true, privateAppId: input.privateAppId, gateId: input.gateId, epoch: input.epoch, origin: input.origin, expiresAt: input.proofExpiresAt };
}

function failure(error: VeilPassErrorCode, requestId: string): VerifyResult { return { ok: false, error, requestId }; }
