import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";

import { getGatePolicy, isAllowedGate } from "@/lib/server/gate-policy";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { readJsonLimited } from "@/lib/server/request-body";
import { createSimulatedProof } from "@/packages/proof/src/simulated";
import { simulatedProofsAllowed } from "@/packages/proof/src/mode";
import { challengeResponseSchema } from "@/packages/shared/src/contracts";
import { issuedCredentialSchema } from "@/packages/credential/src/schema";
import { z } from "zod";

const schema = z.object({ challenge: challengeResponseSchema, credential: issuedCredentialSchema, derived: z.object({ privateAppId: z.string().min(1).max(256), loginNullifier: z.string().min(1).max(256), revocationHash: z.string().min(1).max(256) }).strict() }).strict();

export async function POST(request: NextRequest) {
  const id = requestId();
  if (!simulatedProofsAllowed()) return publicError("SERVICE_UNAVAILABLE", id, 503);
  try { resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); }
  catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = schema.safeParse(await readJsonLimited(request, 64_000).catch(() => null));
  if (!parsed.success) return publicError("PROOF_INVALID", id, 400);
  const { challenge, credential, derived } = parsed.data;
  if (!isAllowedGate(challenge.gateId) || Date.parse(challenge.expiresAt) <= Date.now()) return publicError("CHALLENGE_EXPIRED", id, 400);
  const key = process.env.VEILPASS_SIMULATOR_KEY ?? (process.env.NODE_ENV === "production" ? "" : "veilpass-local-simulator-only");
  if (!key) return publicError("SERVICE_UNAVAILABLE", id, 503);
  let policy; try { policy = await getGatePolicy(challenge.gateId); } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  if (!policy.active) return publicError("CREDENTIAL_REVOKED", id, 400);
  if (credential.gateId !== challenge.gateId || credential.epoch !== policy.epoch) return publicError("STALE_EPOCH", id, 400);
  if (credential.credentialRoot !== policy.credentialRoot || Date.parse(credential.expiresAt) <= Date.now()) return publicError("CREDENTIAL_EXPIRED", id, 400);
  const canonical = JSON.stringify([credential.gateId, credential.epoch, credential.commitment, credential.credentialRoot, credential.expiresAt, credential.issuerPublicKey]);
  const validIssuer = Keypair.fromPublicKey(credential.issuerPublicKey).verify(createHash("sha256").update(canonical).digest(), Buffer.from(credential.issuerSignature, "base64"));
  if (!validIssuer) return publicError("PROOF_INVALID", id, 400);
  const challengeHash = createHash("sha256").update(Buffer.from(challenge.challenge, "base64url")).digest("hex");
  const proofExpiresAt = new Date(Math.min(Date.parse(challenge.expiresAt), Date.now() + 5 * 60_000)).toISOString();
  const proof = createSimulatedProof({ challengeId: challenge.challengeId, key, publicInputs: { gateId: challenge.gateId, epoch: policy.epoch, origin: challenge.origin, challengeHash, credentialRoot: policy.credentialRoot, privateAppId: derived.privateAppId, loginNullifier: derived.loginNullifier, revocationHash: derived.revocationHash, proofExpiresAt } });
  return NextResponse.json(proof, { headers: { "Cache-Control": "no-store" } });
}
