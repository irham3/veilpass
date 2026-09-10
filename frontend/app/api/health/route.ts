import { NextResponse } from "next/server";

import { inspectRuntimeConfiguration } from "@/lib/server/runtime-config";

/** Safe deployment readiness endpoint: issue codes only, never configuration values. */
export async function GET() {
  const report = inspectRuntimeConfiguration();
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
