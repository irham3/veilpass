import { NextResponse } from "next/server";

import type { VeilPassErrorCode } from "@/packages/shared/src/contracts";

export function publicError(error: VeilPassErrorCode, requestId: string, status = 400) {
  return NextResponse.json({ ok: false as const, error, requestId }, { status });
}

export function requestId(): string { return crypto.randomUUID(); }
