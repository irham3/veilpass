import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { ChallengeStore } from "@/lib/server/challenge-store";
import { createSimulatedProof, verifySimulatedProof } from "@/packages/proof/src/simulated";
import { fieldHexFromDigest } from "@/packages/shared/src/field";
import { verifyVeilPassProof } from "./verifier";

describe("verifyVeilPassProof", () => {
  it("keeps credential and origin values out of rejection logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const privateOrigin = "https://private-origin.example";
    await verifyVeilPassProof({ proofResult: null, expectedOrigin: privateOrigin, expectedGateId: "private-gate", store: new ChallengeStore(), policy: { active: true, epoch: 1, credentialRoot: "secret-root" }, verifyProof: () => false, requestId: "support-ref" });
    await verifyVeilPassProof({ proofResult: { ...createSimulatedProof({ challengeId: "challenge", publicInputs: { gateId: "private-gate", epoch: 1, origin: "https://attacker.example", challengeHash: "hash", credentialCommitment: "commitment", credentialRoot: "secret-root", privateAppId: "private-app", loginNullifier: "nullifier-secret", revocationHash: "revocation-secret", proofCreatedAt: "2026-08-02T08:00:00.000Z", proofExpiresAt: "2026-08-02T08:05:00.000Z" }, key: "key" }) }, expectedOrigin: privateOrigin, expectedGateId: "private-gate", store: new ChallengeStore(), policy: { active: true, epoch: 1, credentialRoot: "secret-root" }, verifyProof: () => false, now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "support-ref" });
    const logs = log.mock.calls.map((args) => String(args[0])).join(" ");
    expect(logs).toContain('"requestId":"support-ref"');
    for (const secret of [privateOrigin, "https://attacker.example", "secret-root", "nullifier-secret", "revocation-secret"]) expect(logs).not.toContain(secret);
    log.mockRestore();
  });

  it("returns only minimized success fields and rejects replay", async () => {
    const store = new ChallengeStore({ now: () => Date.parse("2026-08-02T08:00:00.000Z"), randomBytes: () => Buffer.alloc(32, 3) });
    const challenge = await store.issue({ gateId: "premium-holder", origin: "https://app.example" });
    const challengeHash = fieldHexFromDigest(createHash("sha256").update(Buffer.from(challenge.challenge, "base64url")).digest());
    const proofResult = createSimulatedProof({ challengeId: challenge.challengeId, publicInputs: { gateId: "premium-holder", epoch: 7, origin: "https://app.example", challengeHash, credentialCommitment: "commitment-a", credentialRoot: "root-a", privateAppId: "vp_private", loginNullifier: "nullifier-1", revocationHash: "rev-a", proofCreatedAt: "2026-08-02T08:00:00.000Z", proofExpiresAt: "2026-08-02T08:05:00.000Z" }, key: "test-key" });
    const policy = { active: true, epoch: 7, credentialRoot: "root-a", revocationHash: "rev-a" };
    const verified = await verifyVeilPassProof({ proofResult, expectedOrigin: "https://app.example", expectedGateId: "premium-holder", store, policy, verifyProof: (result) => verifySimulatedProof({ proofResult: result, key: "test-key" }), now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "request-1" });
    expect(verified).toEqual({ ok: true, eligible: true, privateAppId: "vp_private", gateId: "premium-holder", epoch: 7, origin: "https://app.example", expiresAt: "2026-08-02T08:05:00.000Z" });
    expect(JSON.stringify(verified)).not.toMatch(/proof|nullifier|root|revocation|wallet/i);
    await expect(verifyVeilPassProof({ proofResult, expectedOrigin: "https://app.example", expectedGateId: "premium-holder", store, policy, verifyProof: (result) => verifySimulatedProof({ proofResult: result, key: "test-key" }), now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "request-2" })).resolves.toEqual({ ok: false, error: "CHALLENGE_SPENT", requestId: "request-2" });
  });

  it("rejects origin, stale policy, revocation, expiry, and invalid proof", async () => {
    const store = new ChallengeStore();
    const base = { challengeId: "missing", proof: "bad", publicInputs: { gateId: "gate", epoch: 1, origin: "https://app.example", challengeHash: "hash", credentialCommitment: "commitment", credentialRoot: "root", privateAppId: "private", loginNullifier: "null", revocationHash: "rev", proofCreatedAt: "2026-08-02T08:00:00.000Z", proofExpiresAt: "2026-08-02T08:05:00.000Z" } };
    const args = { proofResult: base, expectedOrigin: "https://other.example", expectedGateId: "gate", store, policy: { active: true, epoch: 1, credentialRoot: "root", revocationHash: "rev" }, verifyProof: () => true, now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "r" };
    await expect(verifyVeilPassProof(args)).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example", policy: { ...args.policy, epoch: 2 } })).resolves.toMatchObject({ ok: false, error: "STALE_EPOCH" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example", policy: { ...args.policy, active: false } })).resolves.toMatchObject({ ok: false, error: "CREDENTIAL_REVOKED" });
    await expect(verifyVeilPassProof({ ...args, proofResult: { ...base, publicInputs: { ...base.publicInputs, proofCreatedAt: "2026-08-02T08:59:00.000Z" } }, expectedOrigin: "https://app.example", now: () => Date.parse("2026-08-02T09:00:00.000Z") })).resolves.toMatchObject({ ok: false, error: "CREDENTIAL_EXPIRED" });
    await expect(verifyVeilPassProof({ ...args, expectedOrigin: "https://app.example" })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
  });

  it("fails closed for every protocol boundary before consuming a challenge", async () => {
    const store = { consume: async () => ({ ok: true as const }) };
    const base = { challengeId: "challenge", proof: "proof", publicInputs: { gateId: "gate", epoch: 1, origin: "https://app.example", challengeHash: "hash", credentialCommitment: "commitment", credentialRoot: "root", privateAppId: "private", loginNullifier: "null", revocationHash: "rev", proofCreatedAt: "2026-08-02T08:00:00.000Z", proofExpiresAt: "2026-08-02T08:05:00.000Z" } };
    const common = { expectedOrigin: "https://app.example", expectedGateId: "gate", store, policy: { active: true, epoch: 1, credentialRoot: "root" }, verifyProof: () => true, now: () => Date.parse("2026-08-02T08:00:00.000Z"), requestId: "boundary" };
    await expect(verifyVeilPassProof({ ...common, proofResult: null })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
    await expect(verifyVeilPassProof({ ...common, proofResult: { ...base, publicInputs: { ...base.publicInputs, proofCreatedAt: "2026-08-02T08:02:00.000Z" } } })).resolves.toMatchObject({ ok: true, eligible: true });
    await expect(verifyVeilPassProof({ ...common, proofResult: base, expectedOrigin: "not-an-origin" })).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
    await expect(verifyVeilPassProof({ ...common, proofResult: { ...base, publicInputs: { ...base.publicInputs, gateId: "other" } } })).resolves.toMatchObject({ ok: false, error: "GATE_MISMATCH" });
    await expect(verifyVeilPassProof({ ...common, proofResult: { ...base, publicInputs: { ...base.publicInputs, proofCreatedAt: "not-a-date" } } })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
    await expect(verifyVeilPassProof({ ...common, proofResult: { ...base, publicInputs: { ...base.publicInputs, proofCreatedAt: "2026-08-02T08:06:00.001Z" } } })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
    await expect(verifyVeilPassProof({ ...common, proofResult: { ...base, publicInputs: { ...base.publicInputs, proofExpiresAt: "2026-08-02T07:59:00.000Z" } } })).resolves.toMatchObject({ ok: false, error: "CREDENTIAL_EXPIRED" });
    await expect(verifyVeilPassProof({ ...common, proofResult: base, policy: { ...common.policy, credentialRoot: "different" } })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
    await expect(verifyVeilPassProof({ ...common, proofResult: base, policy: { ...common.policy, isRevoked: async () => true } })).resolves.toMatchObject({ ok: false, error: "CREDENTIAL_REVOKED" });
    await expect(verifyVeilPassProof({ ...common, proofResult: base, verifyProof: () => false })).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
    const consumed = { consume: async () => ({ ok: false as const, error: "CHALLENGE_EXPIRED" as const }) };
    await expect(verifyVeilPassProof({ ...common, proofResult: base, store: consumed })).resolves.toMatchObject({ ok: false, error: "CHALLENGE_EXPIRED" });
  });
});
