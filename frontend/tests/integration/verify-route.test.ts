import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verify, createSession } = vi.hoisted(() => ({ verify: vi.fn(), createSession: vi.fn() }));

vi.mock("@/lib/server/challenge-store", () => ({ durableChallengeStoreConfigured: true, challengeStore: {} }));
vi.mock("@/lib/server/gate-policy", () => ({
  isAllowedGate: (gateId: string) => gateId === "premium-holder",
  getGatePolicy: vi.fn(async () => ({ active: true, epoch: 1, credentialRoot: "0".repeat(64) })),
}));
vi.mock("@/lib/server/session-store", () => ({ sessionStore: { create: createSession } }));
vi.mock("@/lib/server/verifier-gate", () => ({ verifierGate: { run: (callback: () => unknown) => callback() } }));
vi.mock("@/lib/server/zk-verifier", () => ({ verifyNoirMembershipProof: vi.fn(async () => true) }));
vi.mock("@/packages/server/src/verifier", () => ({ verifyVeilPassProof: verify }));

import { POST } from "@/app/api/verify/route";

const body = {
  challengeId: "challenge-1",
  proof: "proof-base64",
  publicInputs: {
    gateId: "premium-holder",
    epoch: 1,
    origin: "http://localhost:3000",
    challengeHash: "1".repeat(64),
    credentialCommitment: "2".repeat(64),
    credentialRoot: "0".repeat(64),
    privateAppId: "3".repeat(64),
    loginNullifier: "4".repeat(64),
    revocationHash: "5".repeat(64),
    proofCreatedAt: "2026-09-25T10:00:00.000Z",
    proofExpiresAt: "2026-09-25T10:02:00.000Z",
  },
};

function request(value: unknown = body, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(value),
  });
}

describe("POST /api/verify server session boundary", () => {
  beforeEach(() => {
    vi.stubEnv("VEILPASS_HOST_ORIGIN", "http://localhost:3000");
    verify.mockReset();
    createSession.mockReset();
    createSession.mockResolvedValue("opaque-session-token");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sets an opaque cookie only after successful server verification", async () => {
    vi.stubEnv("NODE_ENV", "production");
    verify.mockResolvedValue({
      ok: true,
      eligible: true,
      privateAppId: body.publicInputs.privateAppId,
      gateId: "premium-holder",
      epoch: 1,
      origin: body.publicInputs.origin,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("vp_session=opaque-session-token");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(createSession).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({ ok: true, eligible: true, privateAppId: body.publicInputs.privateAppId });
  });

  it("does not create a session for revoked or invalid proof results", async () => {
    verify.mockResolvedValue({ ok: false, error: "CREDENTIAL_REVOKED", requestId: "req-1" });
    const revoked = await POST(request());
    expect(revoked.status).toBe(400);
    expect(revoked.headers.get("set-cookie")).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
    await expect(revoked.json()).resolves.toEqual({ ok: false, error: "CREDENTIAL_REVOKED", requestId: "req-1" });

    const malformed = await POST(request({ ...body, unexpected: true }));
    expect(malformed.status).toBe(400);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects an untrusted origin before parsing or verifying", async () => {
    const response = await POST(request(body, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(verify).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
  });
});
