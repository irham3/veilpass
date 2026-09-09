import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issuedCredentialCanonical } from "@/lib/server/credential-issuance";
import { credentialTreeStore, durableCredentialTreeStoreConfigured } from "@/lib/server/credential-tree";
import { getGatePolicy, isAllowedGate } from "@/lib/server/gate-policy";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { readJsonLimited } from "@/lib/server/request-body";
import { issuedCredentialSchema } from "@/packages/credential/src/schema";

const schema = z.object({ credential: issuedCredentialSchema }).strict();

/** Returns a fresh Merkle path after another credential changes the shared root. */
export async function POST(request: NextRequest) {
  const id = requestId();
  if (process.env.NODE_ENV === "production" && !durableCredentialTreeStoreConfigured) return publicError("SERVICE_UNAVAILABLE", id, 503);
  try { resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); }
  catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = schema.safeParse(await readJsonLimited(request, 64_000).catch(() => null));
  if (!parsed.success || !isAllowedGate(parsed.data.credential.gateId)) return publicError("PROOF_INVALID", id, 400);
  const credential = parsed.data.credential;
  const issuerSecret = process.env.VEILPASS_ISSUER_SECRET;
  if (!issuerSecret) return publicError("SERVICE_UNAVAILABLE", id, 503);
  let issuer: Keypair;
  try { issuer = Keypair.fromSecret(issuerSecret); } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  if (credential.issuerPublicKey !== issuer.publicKey() || !issuer.verify(createHash("sha256").update(issuedCredentialCanonical(credential)).digest(), Buffer.from(credential.issuerSignature, "base64"))) return publicError("PROOF_INVALID", id, 400);
  let policy;
  try { policy = await getGatePolicy(credential.gateId); } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  if (!policy.active || policy.epoch !== credential.epoch) return publicError("STALE_EPOCH", id, 400);
  const witness = await credentialTreeStore.witnessForCredential({ gateId: credential.gateId, credentialCommitment: credential.commitment, expectedRoot: policy.credentialRoot }).catch(() => null);
  if (!witness) return publicError("CREDENTIAL_REVOKED", id, 400);
  return NextResponse.json(witness, { headers: { "Cache-Control": "no-store" } });
}
