import { createHash, timingSafeEqual } from "node:crypto";

import { normalizeOrigin, proofResultSchema, type ProofResult, type VerifyResult, type VeilPassErrorCode } from "@veilpass/shared";
import type { ChallengeStore } from "./types";

export type GatePolicy = { active: boolean; epoch: number; credentialRoot: string; owner?: string; isRevoked?: (revocationHash: string) => Promise<boolean> };
export type ProofVerifier = (proofResult: ProofResult) => Promise<boolean> | boolean;
const MAX_FUTURE_PROOF_CLOCK_SKEW_MS = 5 * 60_000;

export async function verifyVeilPassProof({ proofResult, expectedOrigin, expectedGateId, store, policy, verifyProof, now = Date.now, requestId }: { proofResult: unknown; expectedOrigin: string; expectedGateId: string; store: ChallengeStore; policy: GatePolicy; verifyProof: ProofVerifier; now?: () => number; requestId: string }): Promise<VerifyResult> {
  const parsed = proofResultSchema.safeParse(proofResult);
  if (!parsed.success) {
    logVerificationFailure(requestId, "PROOF_INVALID");
    return failure("PROOF_INVALID", requestId);
  }
  const result: ProofResult = parsed.data;
  const input = result.publicInputs;
  let normalizedExpected: string;
  try { normalizedExpected = normalizeOrigin(expectedOrigin); } catch {
    logVerificationFailure(requestId, "ORIGIN_MISMATCH");
    return failure("ORIGIN_MISMATCH", requestId);
  }
  if (!safeEqual(input.origin, normalizedExpected)) {
    logVerificationFailure(requestId, "ORIGIN_MISMATCH");
    return failure("ORIGIN_MISMATCH", requestId);
  }
  if (!safeEqual(input.gateId, expectedGateId)) {
    logVerificationFailure(requestId, "GATE_MISMATCH");
    return failure("GATE_MISMATCH", requestId);
  }
  const proofCreatedAt = Date.parse(input.proofCreatedAt);
  // Browser and serverless clocks can drift. The proof still has to expire
  // within its server-issued five-minute challenge and the challenge is checked
  // again atomically on consume, so allow at most that same future skew here.
  if (!Number.isFinite(proofCreatedAt) || proofCreatedAt > now() + MAX_FUTURE_PROOF_CLOCK_SKEW_MS || proofCreatedAt < now() - 10 * 60_000) {
    logVerificationFailure(requestId, "PROOF_INVALID", "invalid_proof_time");
    return failure("PROOF_INVALID", requestId);
  }
  if (Date.parse(input.proofExpiresAt) <= now()) {
    logVerificationFailure(requestId, "CREDENTIAL_EXPIRED");
    return failure("CREDENTIAL_EXPIRED", requestId);
  }
  if (!policy.active) {
    logVerificationFailure(requestId, "CREDENTIAL_REVOKED");
    return failure("CREDENTIAL_REVOKED", requestId);
  }
  if (input.epoch !== policy.epoch) {
    logVerificationFailure(requestId, "STALE_EPOCH");
    return failure("STALE_EPOCH", requestId);
  }
  const normalizedInputRoot = normalizeHex(input.credentialRoot);
  const normalizedPolicyRoot = normalizeHex(policy.credentialRoot);
  if (!safeEqual(normalizedInputRoot, normalizedPolicyRoot)) {
    logVerificationFailure(requestId, "PROOF_INVALID", "credential_root_mismatch");
    return failure("PROOF_INVALID", requestId);
  }
  if (policy.isRevoked && await policy.isRevoked(input.revocationHash)) {
    logVerificationFailure(requestId, "CREDENTIAL_REVOKED");
    return failure("CREDENTIAL_REVOKED", requestId);
  }
  if (!await verifyProof(result)) {
    logVerificationFailure(requestId, "PROOF_INVALID", "cryptographic_proof_rejected");
    return failure("PROOF_INVALID", requestId);
  }
  const consumed = await store.consume({ challengeId: result.challengeId, challengeHash: input.challengeHash, gateId: input.gateId, origin: input.origin, loginNullifier: input.loginNullifier, proofExpiresAt: input.proofExpiresAt });
  if (!consumed.ok) {
    logVerificationFailure(requestId, consumed.error);
    return failure(consumed.error, requestId);
  }
  return { ok: true, eligible: true, privateAppId: input.privateAppId, gateId: input.gateId, epoch: input.epoch, origin: input.origin, expiresAt: input.proofExpiresAt };
}

function failure(error: VeilPassErrorCode, requestId: string): VerifyResult { return { ok: false, error, requestId }; }
function logVerificationFailure(requestId: string, reason: VeilPassErrorCode, stage?: string): void {
  console.error(JSON.stringify({ event: "proof_verification_rejected", requestId, reason, stage }));
}
function safeEqual(left: string, right: string): boolean { const a = createHash("sha256").update(left).digest(); const b = createHash("sha256").update(right).digest(); return timingSafeEqual(a, b); }
function normalizeHex(value: string): string { return value.trim().toLowerCase().replace(/^0x/i, ""); }
