import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { simulatedProofsAllowed, getGatePolicy, isAllowedGate, verifyIssuer, createSimulatedProof } = vi.hoisted(() => ({
  simulatedProofsAllowed: vi.fn(),
  getGatePolicy: vi.fn(),
  isAllowedGate: vi.fn(),
  verifyIssuer: vi.fn(),
  createSimulatedProof: vi.fn(),
}));
vi.mock("@/packages/proof/src/mode", () => ({ simulatedProofsAllowed }));
vi.mock("@/lib/server/gate-policy", () => ({ getGatePolicy, isAllowedGate }));
vi.mock("@/packages/proof/src/simulated", () => ({ createSimulatedProof }));
vi.mock("@stellar/stellar-sdk", () => ({ Keypair: { fromPublicKey: vi.fn(() => ({ verify: verifyIssuer })) } }));

import { POST } from "@/app/api/proof/simulate/route";

const origin = "http://localhost:3000";
function request(body: unknown, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/proof/simulate`, { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.stubEnv("VEILPASS_LOGIN_ORIGIN", origin);
  simulatedProofsAllowed.mockReset();
  simulatedProofsAllowed.mockReturnValue(true);
  getGatePolicy.mockReset().mockResolvedValue({ active: true, epoch: 1, credentialRoot: "0".repeat(64) });
  isAllowedGate.mockReset().mockReturnValue(true);
  verifyIssuer.mockReset().mockReturnValue(true);
  createSimulatedProof.mockReset().mockImplementation(({ challengeId, publicInputs }) => ({ challengeId, proof: "simulated-v1.fixture", publicInputs }));
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

  function validPayload(overrides: { challenge?: Record<string, unknown>; credential?: Record<string, unknown> } = {}) {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    return {
      challenge: {
        challengeId: "challenge-1",
        challenge: Buffer.from("one-time-challenge").toString("base64url"),
        origin,
        gateId: "premium-holder",
        expiresAt,
        ...overrides.challenge,
      },
      credential: {
        gateId: "premium-holder",
        epoch: 1,
        commitment: "1".repeat(64),
        credentialSalt: "2".repeat(64),
        credentialRoot: "0".repeat(64),
        leafIndex: 0,
        leafNonce: "3".repeat(64),
        merklePath: Array.from({ length: 16 }, () => "4".repeat(64)),
        pathIsRight: Array.from({ length: 16 }, () => false),
        revocationHash: "5".repeat(64),
        expiresAt,
        issuerPublicKey: "GISSUER",
        issuerSignature: Buffer.from("signature").toString("base64"),
        ...overrides.credential,
      },
      derived: { privateAppId: "6".repeat(64), loginNullifier: "7".repeat(64), revocationHash: "5".repeat(64) },
    };
  }

  it("rejects unsupported gates and expired challenges before loading policy", async () => {
    isAllowedGate.mockReturnValue(false);
    const unsupported = await POST(request(validPayload()));
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toMatchObject({ error: "CHALLENGE_EXPIRED" });
    expect(getGatePolicy).not.toHaveBeenCalled();

    isAllowedGate.mockReturnValue(true);
    const expired = await POST(request(validPayload({ challenge: { expiresAt: new Date(Date.now() - 1).toISOString() } })));
    expect(expired.status).toBe(400);
    await expect(expired.json()).resolves.toMatchObject({ error: "CHALLENGE_EXPIRED" });
    expect(getGatePolicy).not.toHaveBeenCalled();
  });

  it("fails closed in production when the simulator key is absent", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VEILPASS_SIMULATOR_KEY", "");
    const response = await POST(request(validPayload()));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "SERVICE_UNAVAILABLE" });
    expect(getGatePolicy).not.toHaveBeenCalled();
  });

  it("maps policy outages, inactive gates, and stale credentials to safe errors", async () => {
    getGatePolicy.mockRejectedValueOnce(new Error("RPC unavailable"));
    const unavailable = await POST(request(validPayload()));
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({ error: "SERVICE_UNAVAILABLE" });

    getGatePolicy.mockResolvedValueOnce({ active: false, epoch: 1, credentialRoot: "0".repeat(64) });
    const revoked = await POST(request(validPayload()));
    expect(revoked.status).toBe(400);
    await expect(revoked.json()).resolves.toMatchObject({ error: "CREDENTIAL_REVOKED" });

    getGatePolicy.mockResolvedValueOnce({ active: true, epoch: 2, credentialRoot: "0".repeat(64) });
    const stale = await POST(request(validPayload()));
    expect(stale.status).toBe(400);
    await expect(stale.json()).resolves.toMatchObject({ error: "STALE_EPOCH" });
  });

  it("rejects root, expiry, and issuer signature mismatches", async () => {
    const rootMismatch = await POST(request(validPayload({ credential: { credentialRoot: "8".repeat(64) } })));
    expect(rootMismatch.status).toBe(400);
    await expect(rootMismatch.json()).resolves.toMatchObject({ error: "CREDENTIAL_EXPIRED" });

    const expiredCredential = await POST(request(validPayload({ credential: { expiresAt: new Date(Date.now() - 1).toISOString() } })));
    expect(expiredCredential.status).toBe(400);
    await expect(expiredCredential.json()).resolves.toMatchObject({ error: "CREDENTIAL_EXPIRED" });

    verifyIssuer.mockReturnValue(false);
    const invalidSignature = await POST(request(validPayload()));
    expect(invalidSignature.status).toBe(400);
    await expect(invalidSignature.json()).resolves.toMatchObject({ error: "PROOF_INVALID" });
    expect(createSimulatedProof).not.toHaveBeenCalled();
  });

  it("returns a no-store proof binding the signed credential to the challenge and origin", async () => {
    const payload = validPayload();
    const response = await POST(request(payload));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result).toMatchObject({ challengeId: "challenge-1", proof: "simulated-v1.fixture" });
    expect(createSimulatedProof).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "challenge-1",
      key: "veilpass-local-simulator-only",
      publicInputs: expect.objectContaining({
        origin,
        gateId: "premium-holder",
        epoch: 1,
        credentialCommitment: "1".repeat(64),
        privateAppId: payload.derived.privateAppId,
        loginNullifier: payload.derived.loginNullifier,
      }),
    }));
  });
});
