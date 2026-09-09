import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { durableEnrollmentStoreConfigured, enrollmentStore } from "@/lib/server/enrollment-store";
import { buildIssuedCredentialPayload, issuedCredentialCanonical } from "@/lib/server/credential-issuance";
import { credentialTreeStore, durableCredentialTreeStoreConfigured } from "@/lib/server/credential-tree";
import { getGatePolicy } from "@/lib/server/gate-policy";
import { gateRootPublisherConfigured, publishCredentialRoot } from "@/lib/server/root-publisher";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { readJsonLimited } from "@/lib/server/request-body";
import { canonicalFieldHex } from "@/packages/shared/src/field";

const schema = z.object({ challengeId: z.string().uuid(), address: z.string().min(1).max(128), message: z.string().min(1).max(1024), gateId: z.string().min(1).max(128), signature: z.string().min(1).max(1024), commitment: z.string().regex(/^[a-f0-9]{64}$/), credentialSalt: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export async function POST(request: NextRequest) {
  const id = requestId();
  if (process.env.NODE_ENV === "production" && (!durableEnrollmentStoreConfigured || !durableCredentialTreeStoreConfigured || !gateRootPublisherConfigured)) return publicError("SERVICE_UNAVAILABLE", id, 503);
  try { resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); } catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = schema.safeParse(await readJsonLimited(request, 8_192).catch(() => null));
  if (!parsed.success) return publicError("PROOF_INVALID", id, 400);
  const consumed = await enrollmentStore.consume({ challengeId: parsed.data.challengeId, address: parsed.data.address, message: parsed.data.message, gateId: parsed.data.gateId });
  if (!consumed) return publicError("CHALLENGE_SPENT", id, 400);
  const valid = Keypair.fromPublicKey(parsed.data.address).verify(Buffer.from(parsed.data.message), Buffer.from(parsed.data.signature, "base64"));
  if (!valid) return publicError("PROOF_INVALID", id, 400);
  const issuerSecret = process.env.VEILPASS_ISSUER_SECRET;
  if (!issuerSecret) return publicError("SERVICE_UNAVAILABLE", id, 503);
  let issuer: Keypair; try { issuer = Keypair.fromSecret(issuerSecret); } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  let policy;
  try { policy = await getGatePolicy(parsed.data.gateId); }
  catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  try { canonicalFieldHex(policy.credentialRoot); }
  catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  let witness;
  try {
    witness = await credentialTreeStore.issue({
      gateId: parsed.data.gateId,
      epoch: policy.epoch,
      credentialCommitment: parsed.data.commitment,
      credentialSalt: parsed.data.credentialSalt,
      expiresAt,
      expectedRoot: policy.credentialRoot,
      publishRoot: async (root) => publishCredentialRoot({ gateId: parsed.data.gateId, expectedEpoch: policy.epoch, newRoot: root }),
    });
  } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  let payload;
  try {
    payload = buildIssuedCredentialPayload({
      gateId: parsed.data.gateId,
      commitment: parsed.data.commitment,
      credentialSalt: parsed.data.credentialSalt,
      witness,
      issuerPublicKey: issuer.publicKey(),
      policy,
      expiresAt,
    });
  } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  const issuerSignature = issuer.sign(createHash("sha256").update(issuedCredentialCanonical(payload)).digest()).toString("base64");
  return NextResponse.json({ ...payload, issuerSignature }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
