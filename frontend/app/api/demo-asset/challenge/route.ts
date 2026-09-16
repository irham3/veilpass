import { StrKey } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { demoAssetClaimStore, durableDemoAssetClaimStoreConfigured } from "@/lib/server/demo-asset-claim-store";
import { getDemoAssetConfig } from "@/lib/server/demo-asset-issuer";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { readJsonLimited } from "@/lib/server/request-body";
import { publicError, requestId } from "@/lib/server/responses";
import { checkTestnetEligibility } from "@/lib/stellar/eligibility";

const schema = z.object({ address: z.string() }).strict();

/** Creates a wallet-bound, origin-bound proof request for the fixed Testnet demo asset. */
export async function POST(request: NextRequest) {
  const id = requestId();
  if (process.env.NODE_ENV === "production" && !durableDemoAssetClaimStoreConfigured) return publicError("SERVICE_UNAVAILABLE", id, 503);

  let origin: string;
  try {
    origin = resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") });
  } catch {
    return publicError("ORIGIN_MISMATCH", id, 403);
  }

  const parsed = schema.safeParse(await readJsonLimited(request, 4_096).catch(() => null));
  if (!parsed.success || !StrKey.isValidEd25519PublicKey(parsed.data.address)) return publicError("PROOF_INVALID", id, 400);
  const config = getDemoAssetConfig();
  if (!config) return publicError("SERVICE_UNAVAILABLE", id, 503);

  let eligibility;
  try {
    eligibility = await checkTestnetEligibility(parsed.data.address);
  } catch {
    return publicError("SERVICE_UNAVAILABLE", id, 503);
  }
  if (!eligibility.configured) return publicError("SERVICE_UNAVAILABLE", id, 503);
  if (!eligibility.hasTrustline) return publicError("ASSET_TRUSTLINE_REQUIRED", id, 409);
  if (eligibility.eligible) return publicError("ASSET_CLAIMED", id, 409);

  const challenge = await demoAssetClaimStore.issue({
    address: parsed.data.address,
    origin,
    assetCode: config.assetCode,
    assetIssuer: config.assetIssuer,
    amount: config.amount,
  });
  return NextResponse.json(challenge, { status: 201, headers: { "Cache-Control": "no-store" } });
}
