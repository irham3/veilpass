import { createHash, createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { getGatePolicy, isAllowedGate } from "@/lib/server/gate-policy";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { createSimulatedProof } from "@/packages/proof/src/simulated";
import { challengeResponseSchema } from "@/packages/shared/src/contracts";

export async function POST(request: NextRequest) {
  const id = requestId();
  try { resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); }
  catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = challengeResponseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return publicError("PROOF_INVALID", id, 400);
  const challenge = parsed.data;
  if (!isAllowedGate(challenge.gateId) || Date.parse(challenge.expiresAt) <= Date.now()) return publicError("CHALLENGE_EXPIRED", id, 400);
  const key = process.env.VEILPASS_SIMULATOR_KEY ?? (process.env.NODE_ENV === "production" ? "" : "veilpass-local-simulator-only");
  if (!key) return publicError("SERVICE_UNAVAILABLE", id, 503);
  const policy = getGatePolicy();
  if (!policy.active) return publicError("CREDENTIAL_REVOKED", id, 400);
  const fixtureCredential = process.env.VEILPASS_FIXTURE_CREDENTIAL ?? "local-fixture-credential";
  const derive = (label: string) => createHmac("sha256", fixtureCredential).update(`${label}:${challenge.origin}:${challenge.gateId}`).digest("base64url");
  const challengeHash = createHash("sha256").update(Buffer.from(challenge.challenge, "base64url")).digest("hex");
  const proofExpiresAt = new Date(Math.min(Date.parse(challenge.expiresAt), Date.now() + 5 * 60_000)).toISOString();
  const proof = createSimulatedProof({ challengeId: challenge.challengeId, key, publicInputs: { gateId: challenge.gateId, epoch: policy.epoch, origin: challenge.origin, challengeHash, credentialRoot: policy.credentialRoot, privateAppId: `vp_${derive("private").slice(0, 24)}`, loginNullifier: derive(`nullifier:${challengeHash}`), revocationHash: policy.revocationHash, proofExpiresAt } });
  return NextResponse.json(proof, { headers: { "Cache-Control": "no-store" } });
}
