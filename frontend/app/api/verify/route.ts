import { type NextRequest, NextResponse } from "next/server";

import { challengeStore, durableChallengeStoreConfigured } from "@/lib/server/challenge-store";
import { getGatePolicy, isAllowedGate } from "@/lib/server/gate-policy";
import { resolveTrustedOrigin } from "@/lib/server/request-origin";
import { publicError, requestId } from "@/lib/server/responses";
import { sessionStore } from "@/lib/server/session-store";
import { readJsonLimited } from "@/lib/server/request-body";
import { verifierGate } from "@/lib/server/verifier-gate";
import { proofResultSchema } from "@/packages/shared/src/contracts";
import { verifyVeilPassProof } from "@/packages/server/src/verifier";
import { verifySimulatedProof } from "@/packages/proof/src/simulated";

export async function POST(request: NextRequest) {
  const id = requestId();
  if (process.env.NODE_ENV === "production" && !durableChallengeStoreConfigured) return publicError("SERVICE_UNAVAILABLE", id, 503);
  let origin: string;
  try { origin = resolveTrustedOrigin({ configuredOrigin: process.env.VEILPASS_HOST_ORIGIN, requestUrl: request.url, originHeader: request.headers.get("origin") }); }
  catch { return publicError("ORIGIN_MISMATCH", id, 403); }
  const parsed = proofResultSchema.safeParse(await readJsonLimited(request).catch(() => null));
  if (!parsed.success) return publicError("PROOF_INVALID", id, 400);
  const gateId = parsed.data.publicInputs.gateId;
  if (!isAllowedGate(gateId)) return publicError("GATE_MISMATCH", id, 400);
  const key = process.env.VEILPASS_SIMULATOR_KEY ?? (process.env.NODE_ENV === "production" ? "" : "veilpass-local-simulator-only");
  if (!key) return publicError("SERVICE_UNAVAILABLE", id, 503);
  let policy; try { policy = await getGatePolicy(gateId); } catch { return publicError("SERVICE_UNAVAILABLE", id, 503); }
  const result = await verifierGate.run(() => verifyVeilPassProof({ proofResult: parsed.data, expectedOrigin: origin, expectedGateId: gateId, store: challengeStore, policy, verifyProof: (proofResult) => verifySimulatedProof({ proofResult, key }), requestId: id }));
  if (!result) return publicError("SERVICE_UNAVAILABLE", id, 503);
  const status = result.ok ? 200 : result.error === "SERVICE_UNAVAILABLE" ? 503 : result.error === "ORIGIN_MISMATCH" ? 403 : 400;
  const response = NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  if (result.ok) {
    const expiresAtMs = Date.parse(result.expiresAt);
    const token = await sessionStore.create({ privateAppId: result.privateAppId, gateId: result.gateId, expiresAtMs });
    response.cookies.set("vp_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000)) });
  }
  return response;
}
