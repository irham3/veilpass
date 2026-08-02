import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { enrollmentStore } from "@/lib/server/enrollment-store";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";

const schema = z.object({ challengeId: z.string().uuid(), signature: z.string().min(1).max(1024), commitment: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export async function POST(request: NextRequest) {
  const id = requestId();
  try { resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); } catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return publicError("PROOF_INVALID", id, 400);
  const challenge = enrollmentStore.consume(parsed.data.challengeId);
  if (!challenge) return publicError("CHALLENGE_SPENT", id, 400);
  const valid = Keypair.fromPublicKey(challenge.address).verify(Buffer.from(challenge.message), Buffer.from(parsed.data.signature, "base64"));
  if (!valid) return publicError("PROOF_INVALID", id, 400);
  const issuerSecret = process.env.VEILPASS_ISSUER_SECRET;
  if (!issuerSecret) return publicError("SERVICE_UNAVAILABLE", id, 503);
  let issuer: Keypair; try { issuer = Keypair.fromSecret(issuerSecret); } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  const payload = { gateId: challenge.gateId, epoch: Number.parseInt(process.env.VEILPASS_GATE_EPOCH ?? "1", 10), commitment: parsed.data.commitment, credentialRoot: parsed.data.commitment, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(), issuerPublicKey: issuer.publicKey() };
  const canonical = JSON.stringify([payload.gateId, payload.epoch, payload.commitment, payload.credentialRoot, payload.expiresAt, payload.issuerPublicKey]);
  const issuerSignature = issuer.sign(createHash("sha256").update(canonical).digest()).toString("base64");
  return NextResponse.json({ ...payload, issuerSignature }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
