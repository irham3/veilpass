import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  issue: vi.fn(), consumeAndReserve: vi.fn(), markIssued: vi.fn(), markUnknown: vi.fn(),
  getDemoAssetConfig: vi.fn(), issueDemoAsset: vi.fn(), checkTestnetEligibility: vi.fn(), verifyStellarMessageSignature: vi.fn(),
}));
vi.mock("@/lib/server/demo-asset-claim-store", () => ({
  durableDemoAssetClaimStoreConfigured: true,
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
});
