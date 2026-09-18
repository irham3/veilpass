import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { issue } = vi.hoisted(() => ({ issue: vi.fn() }));

vi.mock("@/lib/server/challenge-store", () => ({
  durableChallengeStoreConfigured: true,
  challengeStore: { issue },
}));

vi.mock("@/lib/server/gate-policy", () => ({
  isAllowedGate: (gateId: string) => gateId === "premium-holder",
}));

import { POST } from "@/app/api/challenges/route";

function request(body: unknown, origin = "http://localhost:3000", headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/challenges", {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/challenges integration boundary", () => {
  beforeEach(() => {
    issue.mockReset();
    issue.mockResolvedValue({
      challengeId: "2fe46d77-e928-44be-8725-8bbbd1c18df7",
      challenge: "fixture",
      gateId: "premium-holder",
      origin: "http://localhost:3000",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
  });

  it("issues a challenge only after origin and gate validation", async () => {
    const response = await POST(request({ gateId: "premium-holder" }));

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(issue).toHaveBeenCalledWith({
      gateId: "premium-holder",
      origin: "http://localhost:3000",
    });
    await expect(response.json()).resolves.toMatchObject({ gateId: "premium-holder" });
  });

  it("rejects a cross-origin request before touching the store", async () => {
    const response = await POST(request({ gateId: "premium-holder" }, "https://evil.example"));

    expect(response.status).toBe(403);
    expect(issue).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
  });

  it.each([
    { body: { gateId: "not-allowed" }, label: "unknown gate" },
    { body: { gateId: "premium-holder", admin: true }, label: "unknown field" },
    { body: { gateId: "" }, label: "empty gate" },
  ])("rejects $label with a stable public error", async ({ body }) => {
    const response = await POST(request(body));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ ok: false, error: "GATE_MISMATCH" });
    expect(payload).toHaveProperty("requestId");
    expect(JSON.stringify(payload)).not.toMatch(/stack|database|postgres|secret/i);
    expect(issue).not.toHaveBeenCalled();
  });

  it("rejects a declared oversized body without parsing it", async () => {
    const response = await POST(
      request({ gateId: "premium-holder" }, "http://localhost:3000", { "content-length": "4097" }),
    );

    expect(response.status).toBe(400);
    expect(issue).not.toHaveBeenCalled();
  });
});
