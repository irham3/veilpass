import { StrKey } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { readJsonLimited } from "@/lib/server/request-body";
import { publicError, requestId } from "@/lib/server/responses";
import { checkTestnetEligibility } from "@/lib/stellar/eligibility";

const schema = z.object({ address: z.string() }).strict();

/** A read-only preflight check. It never creates an enrollment challenge. */
export async function POST(request: NextRequest) {
  const id = requestId();

  try {
    resolveTrustedOrigin({
      configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN,
      requestUrl: request.url,
      originHeader: request.headers.get("origin"),
    });
  } catch {
    return publicError("ORIGIN_MISMATCH", id, 403);
  }

  const parsed = schema.safeParse(await readJsonLimited(request, 4_096).catch(() => null));

  if (!parsed.success || !StrKey.isValidEd25519PublicKey(parsed.data.address)) {
    return publicError("PROOF_INVALID", id, 400);
  }

  const eligibility = await checkTestnetEligibility(parsed.data.address).catch(() => ({ eligible: false, configured: false }));

  if (!eligibility.configured) {
    return publicError("SERVICE_UNAVAILABLE", id, 503);
  }

  return NextResponse.json(
    { eligible: eligibility.eligible },
    { headers: { "Cache-Control": "no-store" } },
  );
}
