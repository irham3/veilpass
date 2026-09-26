import { type NextRequest, NextResponse } from "next/server";

import { challengeStore, durableChallengeStoreConfigured } from "@/lib/server/challenge-store";
import { getGatePolicy, isAllowedGate } from "@/lib/server/gate-policy";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { sessionStore } from "@/lib/server/session-store";
import { readJsonLimited } from "@/lib/server/request-body";
import { verifierGate } from "@/lib/server/verifier-gate";
import { verifyNoirMembershipProof } from "@/lib/server/zk-verifier";
import { proofResultSchema } from "@/packages/shared/src/contracts";
import { verifyVeilPassProof } from "@/packages/server/src/verifier";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    if (process.env.NODE_ENV === "production" && !durableChallengeStoreConfigured) {
      console.error(JSON.stringify({ event: "verification_unavailable", requestId: id, reason: "durable_store_missing" }));
      return publicError("SERVICE_UNAVAILABLE", id, 503);
    }
    let origin: string;
    try {
      origin = resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_HOST_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") });
    } catch {
      return publicError("ORIGIN_MISMATCH", id, 403);
    }
    const body = await readJsonLimited(request).catch(() => {
      return null;
    });
    const parsed = proofResultSchema.safeParse(body);
    if (!parsed.success) {
      console.error(JSON.stringify({ event: "verification_rejected", requestId: id, reason: "invalid_payload" }));
      return publicError("PROOF_INVALID", id, 400);
    }
    const gateId = parsed.data.publicInputs.gateId;
    if (!isAllowedGate(gateId)) {
      console.error(JSON.stringify({ event: "verification_rejected", requestId: id, reason: "gate_mismatch" }));
      return publicError("GATE_MISMATCH", id, 400);
    }
    let policy;
    try {
      policy = await getGatePolicy(gateId);
    } catch (error) {
      console.error(JSON.stringify({ event: "verification_unavailable", requestId: id, reason: error instanceof Error ? error.name : "unknown" }));
      return publicError("SERVICE_UNAVAILABLE", id, 503);
    }
    const result = await verifierGate.run(() => verifyVeilPassProof({ proofResult: parsed.data, expectedOrigin: origin, expectedGateId: gateId, store: challengeStore, policy, verifyProof: verifyNoirMembershipProof, requestId: id }));
    if (!result) {
      console.error(JSON.stringify({ event: "verification_unavailable", requestId: id, reason: "verifier_capacity" }));
      return publicError("SERVICE_UNAVAILABLE", id, 503);
    }
    if (!result.ok) {
      console.error(JSON.stringify({ event: "verification_rejected", requestId: id, reason: result.error }));
    }
    const status = result.ok ? 200 : result.error === "SERVICE_UNAVAILABLE" ? 503 : result.error === "ORIGIN_MISMATCH" ? 403 : 400;
    const response = NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
    if (result.ok) {
      const expiresAtMs = Date.parse(result.expiresAt);
      const token = await sessionStore.create({ privateAppId: result.privateAppId, gateId: result.gateId, expiresAtMs });
      response.cookies.set("vp_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000)) });
    }
    return response;
  } catch (error) {
    console.error(JSON.stringify({ event: "verification_unavailable", requestId: id, reason: error instanceof Error ? error.name : "unknown" }));
    return publicError("SERVICE_UNAVAILABLE", id, 503);
  }
}
