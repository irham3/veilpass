import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { demoAssetClaimStore, durableDemoAssetClaimStoreConfigured } from "@/lib/server/demo-asset-claim-store";
import { getDemoAssetConfig, issueDemoAsset } from "@/lib/server/demo-asset-issuer";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { readJsonLimited } from "@/lib/server/request-body";
import { publicError, requestId } from "@/lib/server/responses";
import { checkTestnetEligibility } from "@/lib/stellar/eligibility";

const schema = z.object({ challengeId: z.string().uuid(), address: z.string().max(128), message: z.string().min(1).max(1_024), signature: z.string().min(1).max(1_024) }).strict();

function dailyLimit() {
  const configured = Number.parseInt(process.env.VEILPASS_DEMO_ASSET_DAILY_LIMIT ?? "100", 10);
  return Number.isSafeInteger(configured) && configured >= 1 && configured <= 1_000 ? configured : 100;
}

/** Verifies a Freighter-signed claim and sends one fixed Testnet asset balance. */
export async function POST(request: NextRequest) {
  const id = requestId();
  if (process.env.NODE_ENV === "production" && !durableDemoAssetClaimStoreConfigured) return publicError("SERVICE_UNAVAILABLE", id, 503);
  try {
    resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") });
  } catch {
    return publicError("ORIGIN_MISMATCH", id, 403);
  }

  const parsed = schema.safeParse(await readJsonLimited(request, 8_192).catch(() => null));
  if (!parsed.success || !StrKey.isValidEd25519PublicKey(parsed.data.address)) return publicError("PROOF_INVALID", id, 400);
  let signatureValid = false;
  try {
    signatureValid = Keypair.fromPublicKey(parsed.data.address).verify(Buffer.from(parsed.data.message), Buffer.from(parsed.data.signature, "base64"));
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) return publicError("PROOF_INVALID", id, 400);

  const config = getDemoAssetConfig();
  if (!config) return publicError("SERVICE_UNAVAILABLE", id, 503);
  const reservation = await demoAssetClaimStore.consumeAndReserve({ ...parsed.data, dailyLimit: dailyLimit() });
  if (reservation.kind === "challenge_invalid") return publicError("CHALLENGE_SPENT", id, 400);
  if (reservation.kind === "already_claimed") return publicError("ASSET_CLAIMED", id, 409);
  if (reservation.kind === "limit_reached") return publicError("RATE_LIMITED", id, 429);

  try {
    const eligibility = await checkTestnetEligibility(parsed.data.address);
    if (!eligibility.configured || !eligibility.hasTrustline) {
      await demoAssetClaimStore.markUnknown({ address: parsed.data.address, reservationId: reservation.reservationId });
      return publicError("ASSET_TRUSTLINE_REQUIRED", id, 409);
    }
    // A wallet may have been funded between the challenge and this request. Do not send twice.
    if (eligibility.eligible) {
      await demoAssetClaimStore.markIssued({ address: parsed.data.address, reservationId: reservation.reservationId });
      return NextResponse.json({ ok: true, alreadyEligible: true }, { headers: { "Cache-Control": "no-store" } });
    }

    const transactionHash = await issueDemoAsset({ config, destination: parsed.data.address });
    await demoAssetClaimStore.markIssued({ address: parsed.data.address, reservationId: reservation.reservationId, transactionHash });
    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    // A timeout after Horizon accepted the transaction is ambiguous. Keep the reservation closed
    // rather than risking a duplicate Testnet issue; a later eligibility check can still enroll.
    try {
      if ((await checkTestnetEligibility(parsed.data.address)).eligible) {
        await demoAssetClaimStore.markIssued({ address: parsed.data.address, reservationId: reservation.reservationId });
        return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      }
    } catch {
      // The safe state remains unknown.
    }
    await demoAssetClaimStore.markUnknown({ address: parsed.data.address, reservationId: reservation.reservationId });
    return publicError("SERVICE_UNAVAILABLE", id, 503);
  }
}
