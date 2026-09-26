import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { issue, checkTestnetEligibility } = vi.hoisted(() => ({ issue: vi.fn(), checkTestnetEligibility: vi.fn() }));
vi.mock("@/lib/server/enrollment-store", () => ({ durableEnrollmentStoreConfigured: true, enrollmentStore: { issue } }));
vi.mock("@/lib/stellar/eligibility", () => ({ checkTestnetEligibility }));

import { POST as challenge } from "@/app/api/enrollment/challenge/route";
import { POST as eligibility } from "@/app/api/enrollment/eligibility/route";

const address = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 13)).publicKey();
const origin = "http://localhost:3000";

function request(endpoint: string, body: unknown, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/enrollment/${endpoint}`, {
    method: "POST",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("VEILPASS_LOGIN_ORIGIN", origin);
  vi.stubEnv("VEILPASS_GATE_IDS", "premium-holder");
  issue.mockReset();
  issue.mockResolvedValue({ challengeId: "test", message: "sign this" });
  checkTestnetEligibility.mockReset();
  checkTestnetEligibility.mockResolvedValue({ eligible: true, configured: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("enrollment preflight routes", () => {
  it("issues a challenge only for an eligible account on an allowed gate and origin", async () => {
    const response = await challenge(request("challenge", { address, gateId: "premium-holder" }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ challengeId: "test", message: "sign this" });
    expect(issue).toHaveBeenCalledWith({ address, gateId: "premium-holder", origin });
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const foreign = await challenge(request("challenge", { address, gateId: "premium-holder" }, "https://attacker.example"));
    expect(foreign.status).toBe(403);
    expect(issue).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed addresses, unknown gates, ineligible accounts, and unavailable eligibility", async () => {
    for (const body of [{ address: "not-a-key", gateId: "premium-holder" }, { address, gateId: "unknown" }]) {
      const response = await challenge(request("challenge", body));
      expect(response.status).toBe(400);
    }
    expect(checkTestnetEligibility).not.toHaveBeenCalled();

    checkTestnetEligibility.mockResolvedValueOnce({ eligible: false, configured: true });
    const ineligible = await challenge(request("challenge", { address, gateId: "premium-holder" }));
    expect(ineligible.status).toBe(403);
    await expect(ineligible.json()).resolves.toMatchObject({ error: "NOT_ELIGIBLE" });

    checkTestnetEligibility.mockRejectedValueOnce(new Error("Horizon offline"));
    const unavailable = await challenge(request("challenge", { address, gateId: "premium-holder" }));
    expect(unavailable.status).toBe(503);
    expect(issue).not.toHaveBeenCalled();
  });

  it("returns a read-only eligibility result without issuing a challenge", async () => {
    const response = await eligibility(request("eligibility", { address }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ eligible: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(issue).not.toHaveBeenCalled();

    checkTestnetEligibility.mockResolvedValueOnce({ eligible: false, configured: true });
    const ineligible = await eligibility(request("eligibility", { address }));
    await expect(ineligible.json()).resolves.toEqual({ eligible: false });
  });

  it("rejects foreign origins and malformed input, and fails closed when eligibility is unavailable", async () => {
    expect((await eligibility(request("eligibility", { address }, "https://attacker.example"))).status).toBe(403);
    expect((await eligibility(request("eligibility", { address: "bad" }))).status).toBe(400);

    checkTestnetEligibility.mockRejectedValueOnce(new Error("Horizon offline"));
    const response = await eligibility(request("eligibility", { address }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "SERVICE_UNAVAILABLE" });
    expect(issue).not.toHaveBeenCalled();
  });
});
