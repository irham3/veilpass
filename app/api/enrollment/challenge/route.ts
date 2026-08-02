import { StrKey } from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { enrollmentStore } from "@/lib/server/enrollment-store";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { checkTestnetEligibility } from "@/lib/stellar/eligibility";
import { readJsonLimited } from "@/lib/server/request-body";

const schema = z.object({ address: z.string(), gateId: z.string().min(1).max(128) }).strict();
export async function POST(request: NextRequest) {
  const id = requestId(); let origin: string;
  try { origin = resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_LOGIN_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); } catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = schema.safeParse(await readJsonLimited(request, 4_096).catch(() => null));
  if (!parsed.success || !StrKey.isValidEd25519PublicKey(parsed.data.address)) return publicError("PROOF_INVALID", id, 400);
  const eligibility = await checkTestnetEligibility(parsed.data.address).catch(() => ({ eligible: false, configured: true }));
  if (!eligibility.configured) return publicError("SERVICE_UNAVAILABLE", id, 503);
  if (!eligibility.eligible) return publicError("NOT_ELIGIBLE", id, 403);
  return NextResponse.json(enrollmentStore.issue(parsed.data.address, parsed.data.gateId, origin), { status: 201, headers: { "Cache-Control": "no-store" } });
}
