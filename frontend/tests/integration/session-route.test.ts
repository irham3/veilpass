import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieValue, readSession } = vi.hoisted(() => ({ cookieValue: vi.fn(), readSession: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieValue }) }));
vi.mock("@/lib/server/session-store", () => ({ sessionStore: { read: readSession } }));

import { GET } from "@/app/api/session/route";

describe("GET /api/session", () => {
  beforeEach(() => {
    cookieValue.mockReset();
    readSession.mockReset();
  });

  it("returns a minimized non-cacheable authenticated session", async () => {
    cookieValue.mockReturnValue({ value: "opaque-token" });
    readSession.mockResolvedValue({ privateAppId: "private-app-id", gateId: "premium-holder", expiresAtMs: Date.now() + 60_000 });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ authenticated: true, privateAppId: "private-app-id", gateId: "premium-holder" });
    expect(readSession).toHaveBeenCalledWith("opaque-token");
  });

  it("does not read the store or expose identifiers without a cookie", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ authenticated: false });
    expect(readSession).not.toHaveBeenCalled();
  });
});
