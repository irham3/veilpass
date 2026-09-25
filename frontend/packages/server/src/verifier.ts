import { createHash, timingSafeEqual } from "node:crypto";

import { normalizeOrigin, proofResultSchema, type ProofResult, type VerifyResult, type VeilPassErrorCode } from "@veilpass/shared";
import type { ChallengeStore } from "./types";

export type GatePolicy = { active: boolean; epoch: number; credentialRoot: string; owner?: string; isRevoked?: (revocationHash: string) => Promise<boolean> };
export type ProofVerifier = (proofResult: ProofResult) => Promise<boolean> | boolean;

export async function verifyVeilPassProof({ proofResult, expectedOrigin, expectedGateId, store, policy, verifyProof, now = Date.now, requestId }: { proofResult: unknown; expectedOrigin: string; expectedGateId: string; store: ChallengeStore; policy: GatePolicy; verifyProof: ProofVerifier; now?: () => number; requestId: string }): Promise<VerifyResult> {
  const parsed = proofResultSchema.safeParse(proofResult);
  if (!parsed.success) {
    console.error(`[verifier ${requestId}] proofResultSchema validation failed:`, parsed.error.format());
    return failure("PROOF_INVALID", requestId);
  }
  const result: ProofResult = parsed.data;
  const input = result.publicInputs;
  let normalizedExpected: string;
  try { normalizedExpected = normalizeOrigin(expectedOrigin); } catch {
    console.error(`[verifier ${requestId}] Failed to normalize expectedOrigin: ${expectedOrigin}`);
    return failure("ORIGIN_MISMATCH", requestId);
  }
  if (!safeEqual(input.origin, normalizedExpected)) {
    console.error(`[verifier ${requestId}] Origin mismatch: received "${input.origin}", expected "${normalizedExpected}"`);
    return failure("ORIGIN_MISMATCH", requestId);
  }
  if (!safeEqual(input.gateId, expectedGateId)) {
    console.error(`[verifier ${requestId}] Gate ID mismatch: received "${input.gateId}", expected "${expectedGateId}"`);
    return failure("GATE_MISMATCH", requestId);
  }
  const proofCreatedAt = Date.parse(input.proofCreatedAt);
  if (!Number.isFinite(proofCreatedAt) || proofCreatedAt > now() + 60_000 || proofCreatedAt < now() - 10 * 60_000) {
    console.error(`[verifier ${requestId}] Proof timestamp out of allowable window: createdAt=${input.proofCreatedAt}, now=${new Date(now()).toISOString()}`);
    return failure("PROOF_INVALID", requestId);
  }
  if (Date.parse(input.proofExpiresAt) <= now()) {
    console.error(`[verifier ${requestId}] Proof expired: expiresAt=${input.proofExpiresAt}, now=${new Date(now()).toISOString()}`);
    return failure("CREDENTIAL_EXPIRED", requestId);
  }
  if (!policy.active) {
    console.error(`[verifier ${requestId}] Gate policy is not active`);
    return failure("CREDENTIAL_REVOKED", requestId);
  }
  if (input.epoch !== policy.epoch) {
    console.error(`[verifier ${requestId}] Stale epoch: proof epoch ${input.epoch}, policy epoch ${policy.epoch}`);
    return failure("STALE_EPOCH", requestId);
  }
  const normalizedInputRoot = normalizeHex(input.credentialRoot);
  const normalizedPolicyRoot = normalizeHex(policy.credentialRoot);
  if (!safeEqual(normalizedInputRoot, normalizedPolicyRoot)) {
    console.error(`[verifier ${requestId}] Credential root mismatch: proof=${normalizedInputRoot}, policy=${normalizedPolicyRoot}`);
    return failure("PROOF_INVALID", requestId);
  }
  if (policy.isRevoked && await policy.isRevoked(input.revocationHash)) {
    console.error(`[verifier ${requestId}] Credential revocation hash revoked: ${input.revocationHash}`);
    return failure("CREDENTIAL_REVOKED", requestId);
  }
  if (!await verifyProof(result)) {
    console.error(`[verifier ${requestId}] Noir UltraHonk proof verification rejected`);
    return failure("PROOF_INVALID", requestId);
  }
  const consumed = await store.consume({ challengeId: result.challengeId, challengeHash: input.challengeHash, gateId: input.gateId, origin: input.origin, loginNullifier: input.loginNullifier, proofExpiresAt: input.proofExpiresAt });
  if (!consumed.ok) {
    console.error(`[verifier ${requestId}] Challenge store consume failed: ${consumed.error}`);
    return failure(consumed.error, requestId);
  }
  return { ok: true, eligible: true, privateAppId: input.privateAppId, gateId: input.gateId, epoch: input.epoch, origin: input.origin, expiresAt: input.proofExpiresAt };
}

function failure(error: VeilPassErrorCode, requestId: string): VerifyResult { return { ok: false, error, requestId }; }
function safeEqual(left: string, right: string): boolean { const a = createHash("sha256").update(left).digest(); const b = createHash("sha256").update(right).digest(); return timingSafeEqual(a, b); }
function normalizeHex(value: string): string { return value.trim().toLowerCase().replace(/^0x/i, ""); }
