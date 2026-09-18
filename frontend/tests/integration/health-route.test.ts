import { describe, expect, it, vi } from "vitest";

const { inspectRuntimeConfiguration } = vi.hoisted(() => ({
  inspectRuntimeConfiguration: vi.fn(),
}));

vi.mock("@/lib/server/runtime-config", () => ({ inspectRuntimeConfiguration }));

import { GET } from "@/app/api/health/route";

describe("GET /api/health integration boundary", () => {
  it("returns readiness issue codes without leaking configuration values", async () => {
    inspectRuntimeConfiguration.mockReturnValue({
      ok: false,
      issues: ["DATABASE_URL_INVALID"],
      checks: { database: false },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: false,
      issues: ["DATABASE_URL_INVALID"],
      checks: { database: false },
    });
    expect(JSON.stringify(payload)).not.toMatch(/password|secret|postgresql:\/\//i);
  });

  it("returns 200 for a deployment-ready configuration", async () => {
    inspectRuntimeConfiguration.mockReturnValue({ ok: true, issues: [], checks: { database: true } });

    const response = await GET();

    expect(response.status).toBe(200);
  });
});
