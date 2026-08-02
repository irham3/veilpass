import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessionStore } from "@/lib/server/session-store";

export async function GET() {
  const token = (await cookies()).get("vp_session")?.value;
  const session = token ? await sessionStore.read(token) : null;
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ authenticated: true, privateAppId: session.privateAppId, gateId: session.gateId }, { headers: { "Cache-Control": "no-store" } });
}
