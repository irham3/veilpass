import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import { ChallengeStore } from "./challenge-store";
import { fieldHexFromDigest } from "@/packages/shared/src/field";

function challengeHash(challenge: string): string { return fieldHexFromDigest(createHash("sha256").update(Buffer.from(challenge, "base64url")).digest()); }

describe("ChallengeStore", () => {
  it("issues 32 bytes while storing only a digest", async () => {
    const store = new ChallengeStore({ now: () => 1_000, randomBytes: () => Buffer.alloc(32, 7) });
    const issued = await store.issue({ gateId: "gate-a", origin: "https://app.example" });
    expect(Buffer.from(issued.challenge, "base64url")).toHaveLength(32);
    const stored = store.inspectForTest(issued.challengeId);
    expect(stored?.challengeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(issued.challenge);
  });

  it("atomically consumes a challenge and nullifier once", async () => {
    const store = new ChallengeStore({ now: () => 1_000, randomBytes: () => Buffer.alloc(32, 8) });
    const issued = await store.issue({ gateId: "gate-a", origin: "https://app.example" });
    const digest = challengeHash(issued.challenge);
    await expect(store.consume({ ...issued, challengeHash: digest, loginNullifier: "nullifier-a", proofExpiresAt: issued.expiresAt })).resolves.toEqual({ ok: true });
    await expect(store.consume({ ...issued, challengeHash: digest, loginNullifier: "nullifier-b", proofExpiresAt: issued.expiresAt })).resolves.toEqual({ ok: false, error: "CHALLENGE_SPENT" });
  });

  it("rejects nullifier reuse, expiry, origin, gate, and digest mismatches", async () => {
    let now = 1_000;
    let seed = 0;
    const store = new ChallengeStore({ now: () => now, randomBytes: () => Buffer.alloc(32, ++seed) });
    const used = await store.issue({ gateId: "gate-a", origin: "https://app.example" });
    const usedHash = challengeHash(used.challenge);
    await store.consume({ ...used, challengeHash: usedHash, loginNullifier: "reused", proofExpiresAt: used.expiresAt });
    const fresh = await store.issue({ gateId: "gate-a", origin: "https://app.example" });
    const freshHash = challengeHash(fresh.challenge);
    await expect(store.consume({ ...fresh, challengeHash: freshHash, loginNullifier: "reused", proofExpiresAt: fresh.expiresAt })).resolves.toEqual({ ok: false, error: "CHALLENGE_SPENT" });
    await expect(store.consume({ ...fresh, challengeHash: freshHash, origin: "https://evil.example", loginNullifier: "new", proofExpiresAt: fresh.expiresAt })).resolves.toEqual({ ok: false, error: "ORIGIN_MISMATCH" });
    await expect(store.consume({ ...fresh, challengeHash: freshHash, gateId: "gate-b", loginNullifier: "new", proofExpiresAt: fresh.expiresAt })).resolves.toEqual({ ok: false, error: "GATE_MISMATCH" });
    await expect(store.consume({ ...fresh, challengeHash: "wrong", loginNullifier: "new", proofExpiresAt: fresh.expiresAt })).resolves.toEqual({ ok: false, error: "PROOF_INVALID" });
    const expiring = await store.issue({ gateId: "gate-a", origin: "https://app.example" });
    now = 1_000 + 5 * 60_000 + 1;
    const expiringHash = challengeHash(expiring.challenge);
    await expect(store.consume({ ...expiring, challengeHash: expiringHash, loginNullifier: "late", proofExpiresAt: expiring.expiresAt })).resolves.toEqual({ ok: false, error: "CHALLENGE_EXPIRED" });
  });
});
