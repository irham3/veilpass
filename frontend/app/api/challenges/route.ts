import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { challengeStore, durableChallengeStoreConfigured } from "@/lib/server/challenge-store";
import { isAllowedGate } from "@/lib/server/gate-policy";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { readJsonLimited } from "@/lib/server/request-body";

const requestSchema = z.object({ gateId: z.string().min(1).max(128) }).strict();

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    if (process.env.NODE_ENV === "production" && !durableChallengeStoreConfigured) {
      console.error(`[/api/challenges ${id}] Durable challenge store not configured in production`);
      return publicError("SERVICE_UNAVAILABLE", id, 503);
    }
    let origin: string;
    try {
      origin = resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_HOST_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") });
    } catch (error) {
      console.error(`[/api/challenges ${id}] Origin check rejected:`, error instanceof Error ? error.message : error);
      return publicError("ORIGIN_MISMATCH", id, 403);
    }
    const parsed = requestSchema.safeParse(await readJsonLimited(request, 4_096).catch(() => null));
    if (!parsed.success || !isAllowedGate(parsed.data.gateId)) {
      console.error(`[/api/challenges ${id}] Gate mismatch or invalid payload`);
      return publicError("GATE_MISMATCH", id, 400);
    }
    const challenge = await challengeStore.issue({ gateId: parsed.data.gateId, origin });
    return NextResponse.json(challenge, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[/api/challenges ${id}] Failed to issue challenge:`, error);
    return publicError("SERVICE_UNAVAILABLE", id, 503);
  }
}

