import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { ChallengeStore } from "@/lib/server/challenge-store";
import { createSimulatedProof } from "@/packages/proof/src/simulated";
import { verifyVeilPassProof } from "./verifier";

describe("verifyVeilPassProof", () => {
  it("returns only minimized success fields and rejects replay", async () => {
    const store = new ChallengeStore({ now: () => Date.parse("2026-08-02T08:00:00.000Z"), randomBytes: () => Buffer.alloc(32, 3) });
    const challenge = await store.issue({ gateId: "premium-holder", origin: "https://app.example" });
    const challengeHash = createHash("sha256").update(Buffer.from(challenge.challenge, "base64url")).digest("hex");
    const proofResult = createSimulatedProof({ challengeId: challenge.challengeId, publicInputs: { gateId: "premium-holder", epoch: 7, origin: "https://app.example", challengeHash, credentialRoot: "root-a", privateAppId: "vp_private", loginNullifier: "nullifier-1", revocationHash: "rev-a", proofExpiresAt: "2026-08-02T08:05:00.000Z" }, key: "test-key" });
    const policy = { active: true, epoch: 7, credentialRoot: "root-a", revocationHash: "rev-a" };
    const verified = await verifyVeilPassProof({ proofResult, expectedOrigin: "https://app.example", expectedGateId: "premium-holder", store, policy, key: "test-key", now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "request-1" });
    expect(verified).toEqual({ ok: true, privateAppId: "vp_private", gateId: "premium-holder", epoch: 7, origin: "https://app.example", expiresAt: "2026-08-02T08:05:00.000Z" });
    expect(JSON.stringify(verified)).not.toMatch(/proof|nullifier|root|revocation|wallet/i);
    await expect(verifyVeilPassProof({ proofResult, expectedOrigin: "https://app.example", expectedGateId: "premium-holder", store, policy, key: "test-key", now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "request-2" })).resolves.toEqual({ ok: false, error: "CHALLENGE_SPENT", requestId: "request-2" });
  });

  it("rejects origin, stale policy, revocation, expiry, and invalid proof", async () => {
    const store = new ChallengeStore();
    const base = { challengeId: "missing", proof: "bad", publicInputs: { gateId: "gate", epoch: 1, origin: "https://app.example", challengeHash: "hash", credentialRoot: "root", privateAppId: "private", loginNullifier: "null", revocationHash: "rev", proofExpiresAt: "2026-08-02T08:05:00.000Z" } };
    const args = { proofResult: base, expectedOrigin: "https://other.example", expectedGateId: "gate", store, policy: { active: true, epoch: 1, credentialRoot: "root", revocationHash: "rev" }, key: "key", now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "r" };
    await expect(verifyVeilPassProof(args)).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example", policy: { ...args.policy, epoch: 2 } })).resolves.toMatchObject({ ok: false, error: "STALE_EPOCH" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example", policy: { ...args.policy, active: false } })).resolves.toMatchObject({ ok: false, error: "CREDENTIAL_REVOKED" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example", now: () => Date.parse("2026-08-02T09:00:00.000Z") })).resolves.toMatchObject({ ok: false, error: "CREDENTIAL_EXPIRED" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example" })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
  });
});
