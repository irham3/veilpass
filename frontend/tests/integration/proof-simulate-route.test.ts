import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { simulatedProofsAllowed } = vi.hoisted(() => ({ simulatedProofsAllowed: vi.fn() }));
vi.mock("@/packages/proof/src/mode", () => ({ simulatedProofsAllowed }));

import { POST } from "@/app/api/proof/simulate/route";

const origin = "http://localhost:3000";
function request(body: unknown, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/proof/simulate`, { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.stubEnv("VEILPASS_LOGIN_ORIGIN", origin);
  simulatedProofsAllowed.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/proof/simulate", () => {
  it("fails closed when simulator proofs are disabled", async () => {
    simulatedProofsAllowed.mockReturnValue(false);
    const response = await POST(request({}));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "SERVICE_UNAVAILABLE" });
  });

  it("requires the configured origin and a strictly shaped proof request", async () => {
    simulatedProofsAllowed.mockReturnValue(true);
    expect((await POST(request({}, "https://attacker.example"))).status).toBe(403);
    const invalid = await POST(request({ challenge: {}, credential: {}, derived: {}, unexpected: true }));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ error: "PROOF_INVALID" });
  });
});
