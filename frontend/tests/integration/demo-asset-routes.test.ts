import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  issue: vi.fn(), consumeAndReserve: vi.fn(), markIssued: vi.fn(), markUnknown: vi.fn(),
  getDemoAssetConfig: vi.fn(), issueDemoAsset: vi.fn(), checkTestnetEligibility: vi.fn(), verifyStellarMessageSignature: vi.fn(),
  durable: { value: true },
}));
vi.mock("@/lib/server/demo-asset-claim-store", () => ({
  get durableDemoAssetClaimStoreConfigured() { return mocks.durable.value; },
  demoAssetClaimStore: { issue: mocks.issue, consumeAndReserve: mocks.consumeAndReserve, markIssued: mocks.markIssued, markUnknown: mocks.markUnknown },
}));
vi.mock("@/lib/server/demo-asset-issuer", () => ({ getDemoAssetConfig: mocks.getDemoAssetConfig, issueDemoAsset: mocks.issueDemoAsset }));
vi.mock("@/lib/stellar/eligibility", () => ({ checkTestnetEligibility: mocks.checkTestnetEligibility }));
vi.mock("@/lib/stellar/message-signature", () => ({ verifyStellarMessageSignature: mocks.verifyStellarMessageSignature }));

import { POST as challengeRoute } from "@/app/api/demo-asset/challenge/route";
import { POST as issueRoute } from "@/app/api/demo-asset/issue/route";

const origin = "http://localhost:3000";
const address = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 42)).publicKey();
const config = { assetCode: "VPT", assetIssuer: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)).publicKey(), amount: "1", issuerSecret: "test-secret" };
function request(path: string, body: unknown, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/demo-asset/${path}`, { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
const claim = { challengeId: "c35fd0bb-a71f-42a1-8d4b-14a17e487321", address, message: "signed claim", signature: "wallet signature" };

beforeEach(() => {
  vi.stubEnv("VEILPASS_LOGIN_ORIGIN", origin);
  mocks.durable.value = true;
  mocks.issue.mockReset().mockResolvedValue({ challengeId: claim.challengeId, message: claim.message, expiresAt: "2026-09-26T00:00:00.000Z" });
  mocks.consumeAndReserve.mockReset().mockResolvedValue({ kind: "reserved", reservationId: "reservation-1" });
  mocks.markIssued.mockReset().mockResolvedValue(undefined);
  mocks.markUnknown.mockReset().mockResolvedValue(undefined);
  mocks.getDemoAssetConfig.mockReset().mockReturnValue(config);
  mocks.issueDemoAsset.mockReset().mockResolvedValue("tx-hash");
  mocks.checkTestnetEligibility.mockReset().mockResolvedValue({ configured: true, hasTrustline: true, eligible: false });
  mocks.verifyStellarMessageSignature.mockReset().mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe("demo asset enrollment routes", () => {
  it("creates an exact-origin challenge only for a valid account that needs the asset", async () => {
    const response = await challengeRoute(request("challenge", { address }));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.issue).toHaveBeenCalledWith({ address, origin, assetCode: "VPT", assetIssuer: config.assetIssuer, amount: "1" });

    expect((await challengeRoute(request("challenge", { address }, "https://attacker.example"))).status).toBe(403);
    expect((await challengeRoute(request("challenge", { address: "invalid" }))).status).toBe(400);
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: false, hasTrustline: false, eligible: false });
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(503);
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: true, hasTrustline: false, eligible: false });
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(409);
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: true, hasTrustline: true, eligible: true });
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(409);
  });

  it("sends at most one fixed asset payment and records the confirmed result", async () => {
    const response = await issueRoute(request("issue", claim));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.issueDemoAsset).toHaveBeenCalledWith({ config, destination: address });
    expect(mocks.markIssued).toHaveBeenCalledWith({ address, reservationId: "reservation-1", transactionHash: "tx-hash" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    mocks.consumeAndReserve.mockResolvedValueOnce({ kind: "already_claimed" });
    expect((await issueRoute(request("issue", claim))).status).toBe(409);
    mocks.consumeAndReserve.mockResolvedValueOnce({ kind: "limit_reached" });
    expect((await issueRoute(request("issue", claim))).status).toBe(429);
    mocks.consumeAndReserve.mockResolvedValueOnce({ kind: "challenge_invalid" });
    expect((await issueRoute(request("issue", claim))).status).toBe(400);
    expect(mocks.issueDemoAsset).toHaveBeenCalledTimes(1);
  });

  it("fails closed on bad signatures and keeps ambiguous payments reserved", async () => {
    mocks.verifyStellarMessageSignature.mockReturnValue(false);
    expect((await issueRoute(request("issue", claim))).status).toBe(400);
    expect(mocks.consumeAndReserve).not.toHaveBeenCalled();
    mocks.verifyStellarMessageSignature.mockReturnValue(true);
    mocks.issueDemoAsset.mockRejectedValueOnce(new Error("ambiguous Horizon response"));
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: true, hasTrustline: true, eligible: false }).mockResolvedValueOnce({ configured: true, hasTrustline: true, eligible: false });
    const response = await issueRoute(request("issue", claim));
    expect(response.status).toBe(503);
    expect(mocks.markUnknown).toHaveBeenCalledWith({ address, reservationId: "reservation-1" });
  });

  it("rejects invalid challenge requests and fails closed when setup dependencies are unavailable", async () => {
    expect((await challengeRoute(request("challenge", { address }, "https://evil.example"))).status).toBe(403);
    expect((await challengeRoute(request("challenge", { address: "invalid" }))).status).toBe(400);
    const oversized = new NextRequest(`${origin}/api/demo-asset/challenge`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ address, extra: "x".repeat(5_000) }) });
    expect((await challengeRoute(oversized)).status).toBe(400);
    mocks.getDemoAssetConfig.mockReturnValueOnce(null);
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(503);
    mocks.checkTestnetEligibility.mockRejectedValueOnce(new Error("Horizon offline"));
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(503);
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: false, hasTrustline: false, eligible: false });
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(503);

    vi.stubEnv("NODE_ENV", "production");
    mocks.durable.value = false;
    expect((await challengeRoute(request("challenge", { address }))).status).toBe(503);
    expect((await issueRoute(request("issue", claim))).status).toBe(503);
  });

  it("rejects malformed claims and stops before reservation when configuration or signature is invalid", async () => {
    const malformed = new NextRequest(origin + "/api/demo-asset/issue", {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: "{",
    });
    expect((await issueRoute(malformed)).status).toBe(400);
    expect((await issueRoute(request("issue", { ...claim, address: "invalid" }))).status).toBe(400);
    mocks.getDemoAssetConfig.mockReturnValueOnce(null);
    expect((await issueRoute(request("issue", claim))).status).toBe(503);
    expect(mocks.consumeAndReserve).not.toHaveBeenCalled();
  });

  it("marks a reserved claim unknown when eligibility no longer permits issuance", async () => {
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: false, hasTrustline: true, eligible: false });
    const response = await issueRoute(request("issue", claim));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "ASSET_TRUSTLINE_REQUIRED" });
    expect(mocks.markUnknown).toHaveBeenCalledWith({ address, reservationId: "reservation-1" });
    expect(mocks.issueDemoAsset).not.toHaveBeenCalled();

    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: true, hasTrustline: false, eligible: false });
    expect((await issueRoute(request("issue", claim))).status).toBe(409);
  });

  it("does not send a duplicate payment if the wallet became eligible after challenge", async () => {
    mocks.checkTestnetEligibility.mockResolvedValueOnce({ configured: true, hasTrustline: true, eligible: true });
    const response = await issueRoute(request("issue", claim));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, alreadyEligible: true });
    expect(mocks.markIssued).toHaveBeenCalledWith({ address, reservationId: "reservation-1" });
    expect(mocks.issueDemoAsset).not.toHaveBeenCalled();
  });

  it("uses a safe fallback limit when the configured daily cap is invalid", async () => {
    vi.stubEnv("VEILPASS_DEMO_ASSET_DAILY_LIMIT", "invalid");
    expect((await issueRoute(request("issue", claim))).status).toBe(201);
    expect(mocks.consumeAndReserve).toHaveBeenCalledWith(expect.objectContaining({ dailyLimit: 100 }));
  });

  it("resolves an ambiguous transaction only after checking whether the wallet received the asset", async () => {
    mocks.issueDemoAsset.mockRejectedValueOnce(new Error("submission timed out"));
    mocks.checkTestnetEligibility
      .mockResolvedValueOnce({ configured: true, hasTrustline: true, eligible: false })
      .mockResolvedValueOnce({ configured: true, hasTrustline: true, eligible: true });
    const response = await issueRoute(request("issue", claim));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.markIssued).toHaveBeenCalledWith({ address, reservationId: "reservation-1" });
    expect(mocks.markUnknown).not.toHaveBeenCalled();
  });
});
