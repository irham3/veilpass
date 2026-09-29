import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  issue: vi.fn(),
  checkEligibility: vi.fn(),
  durable: { value: true },
}));

vi.mock("@/lib/server/enrollment-store", () => ({
  get durableEnrollmentStoreConfigured() { return mocks.durable.value; },
  enrollmentStore: { issue: mocks.issue },
}));
vi.mock("@/lib/stellar/eligibility", () => ({ checkTestnetEligibility: mocks.checkEligibility }));

import { POST as challenge } from "@/app/api/enrollment/challenge/route";
import { POST as eligibility } from "@/app/api/enrollment/eligibility/route";

const origin = "http://localhost:3000";
const address = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 17)).publicKey();

function request(path: string, body: unknown, requestOrigin = origin) {
  return new NextRequest(origin + "/api/enrollment/" + path, {
    method: "POST",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("VEILPASS_LOGIN_ORIGIN", origin);
  mocks.durable.value = true;
  mocks.issue.mockReset().mockResolvedValue({ challengeId: "challenge-id", expiresAt: "2030-01-01T00:00:00.000Z" });
  mocks.checkEligibility.mockReset().mockResolvedValue({ configured: true, eligible: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("enrollment preflight routes", () => {
  it("issues an address-bound challenge only for an allowed, eligible wallet", async () => {
    const response = await challenge(request("challenge", { address, gateId: "premium-holder" }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.issue).toHaveBeenCalledWith({ address, gateId: "premium-holder", origin });

    mocks.checkEligibility.mockResolvedValueOnce({ configured: true, eligible: false });
    expect((await challenge(request("challenge", { address, gateId: "premium-holder" }))).status).toBe(403);
    expect(mocks.issue).toHaveBeenCalledOnce();
  });

  it("rejects disallowed origins, malformed accounts, and gates before eligibility lookup", async () => {
    expect((await challenge(request("challenge", { address, gateId: "premium-holder" }, "https://evil.example"))).status).toBe(403);
    expect((await challenge(request("challenge", { address: "invalid", gateId: "premium-holder" }))).status).toBe(400);
    vi.stubEnv("VEILPASS_GATE_IDS", "another-gate");
    expect((await challenge(request("challenge", { address, gateId: "premium-holder" }))).status).toBe(400);
    const oversized = new NextRequest(origin + "/api/enrollment/challenge", { method: "POST", headers: { origin, "content-type": "application/json", "content-length": "4097" }, body: JSON.stringify({ address, gateId: "premium-holder" }) });
    expect((await challenge(oversized)).status).toBe(400);
    expect(mocks.checkEligibility).not.toHaveBeenCalled();
  });

  it("requires the durable enrollment store and a configured eligibility service", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.durable.value = false;
    expect((await challenge(request("challenge", { address, gateId: "premium-holder" }))).status).toBe(503);
    mocks.durable.value = true;
    mocks.checkEligibility.mockResolvedValueOnce({ configured: false, eligible: false });
    expect((await challenge(request("challenge", { address, gateId: "premium-holder" }))).status).toBe(503);
    mocks.checkEligibility.mockRejectedValueOnce(new Error("Horizon unavailable"));
    expect((await challenge(request("challenge", { address, gateId: "premium-holder" }))).status).toBe(503);
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it("provides read-only eligibility results and never creates challenges", async () => {
    const positive = await eligibility(request("eligibility", { address }));
    expect(positive.status).toBe(200);
    expect(positive.headers.get("cache-control")).toBe("no-store");
    await expect(positive.json()).resolves.toEqual({ eligible: true });

    mocks.checkEligibility.mockResolvedValueOnce({ configured: true, eligible: false });
    await expect((await eligibility(request("eligibility", { address }))).json()).resolves.toEqual({ eligible: false });
    mocks.checkEligibility.mockResolvedValueOnce({ configured: false, eligible: false });
    expect((await eligibility(request("eligibility", { address }))).status).toBe(503);
    mocks.checkEligibility.mockRejectedValueOnce(new Error("RPC unavailable"));
    expect((await eligibility(request("eligibility", { address }))).status).toBe(503);
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it("rejects untrusted origins and invalid eligibility payloads", async () => {
    expect((await eligibility(request("eligibility", { address }, "https://evil.example"))).status).toBe(403);
    expect((await eligibility(request("eligibility", { address: "invalid" }))).status).toBe(400);
    const malformed = new NextRequest(origin + "/api/enrollment/eligibility", {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: "{",
    });
    expect((await eligibility(malformed)).status).toBe(400);
    expect(mocks.checkEligibility).not.toHaveBeenCalled();
  });
});
