import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fieldHexFromDigest } from "@/packages/shared/src/field";

const { sql, txUnsafe } = vi.hoisted(() => {
  const txUnsafe = vi.fn();
  const sql = Object.assign(vi.fn(), { begin: vi.fn() });
  return { sql, txUnsafe };
});
vi.mock("postgres", () => ({ default: vi.fn(() => sql) }));

import { PostgresChallengeStore } from "./postgres-challenge-store";

const origin = "https://app-a.veilpass.dev";
const gateId = "premium-holder";

beforeEach(() => {
  sql.mockReset().mockResolvedValue([]);
  sql.begin.mockReset().mockImplementation(async (callback: (tx: { unsafe: typeof txUnsafe }) => Promise<unknown>) => callback({ unsafe: txUnsafe }));
  txUnsafe.mockReset();
});

describe("PostgreSQL login challenge lifecycle", () => {
  it("stores only a digest of the challenge and consumes the nullifier once under a row lock", async () => {
    const store = new PostgresChallengeStore("postgresql://test.invalid/db");
    const issued = await store.issue({ gateId, origin });
    const insert = sql.mock.calls[0];
    const challengeHash = fieldHexFromDigest(createHash("sha256").update(Buffer.from(issued.challenge, "base64url")).digest());
    expect(insert[2]).toBe(challengeHash);
    expect(insert[2]).not.toBe(issued.challenge);
    expect(insert[3]).toBe(gateId);
    expect(insert[4]).toBe(origin);

    const record = { challenge_digest: challengeHash, gate_id: gateId, origin, expires_at: new Date(issued.expiresAt), spent_at: null as Date | null };
    let nullifierSpent = false;
    txUnsafe.mockImplementation(async (query: string, params: unknown[]) => {
      if (query.startsWith("select")) return [record];
      if (query.startsWith("insert")) {
        expect(params[0]).toBe(createHash("sha256").update("nullifier-1").digest("hex"));
        if (nullifierSpent) return [];
        nullifierSpent = true;
        return [{ digest: params[0] }];
      }
      if (query.startsWith("update")) { record.spent_at = new Date(); return []; }
      throw new Error("Unexpected SQL");
    });
    const claim = { challengeId: issued.challengeId, challengeHash, gateId, origin, loginNullifier: "nullifier-1", proofExpiresAt: issued.expiresAt };
    expect(await store.consume(claim)).toEqual({ ok: true });
    expect(await store.consume(claim)).toEqual({ ok: false, error: "CHALLENGE_SPENT" });
    expect(txUnsafe.mock.calls[0][0]).toContain("for update");
    expect(txUnsafe.mock.calls.filter(([query]) => String(query).startsWith("update"))).toHaveLength(1);
  });

  it("fails closed for unknown, expired, wrong-origin, wrong-gate, and mismatched challenges", async () => {
    const store = new PostgresChallengeStore("postgresql://test.invalid/db");
    const base = { challengeId: "id", challengeHash: "hash", gateId, origin, loginNullifier: "n", proofExpiresAt: new Date(Date.now() + 60_000).toISOString() };
    const valid = { challenge_digest: "hash", gate_id: gateId, origin, expires_at: new Date(Date.now() + 120_000), spent_at: null };
    const cases: Array<{ record: typeof valid | undefined; claim: typeof base; error: string }> = [
      { record: undefined, claim: base, error: "PROOF_INVALID" },
      { record: { ...valid, expires_at: new Date(0) }, claim: base, error: "CHALLENGE_EXPIRED" },
      { record: valid, claim: { ...base, origin: "https://app-b.veilpass.dev" }, error: "ORIGIN_MISMATCH" },
      { record: valid, claim: { ...base, gateId: "other" }, error: "GATE_MISMATCH" },
      { record: valid, claim: { ...base, challengeHash: "wrong" }, error: "PROOF_INVALID" },
      { record: valid, claim: { ...base, proofExpiresAt: new Date(Date.now() + 300_000).toISOString() }, error: "PROOF_INVALID" },
    ];
    for (const { record, claim, error } of cases) {
      txUnsafe.mockReset().mockResolvedValue(record ? [record] : []);
      expect(await store.consume(claim)).toEqual({ ok: false, error });
      expect(txUnsafe).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects a reused nullifier without spending another challenge", async () => {
    const store = new PostgresChallengeStore("postgresql://test.invalid/db");
    const claim = { challengeId: "id", challengeHash: "hash", gateId, origin, loginNullifier: "n", proofExpiresAt: new Date(Date.now() + 60_000).toISOString() };
    const record = { challenge_digest: "hash", gate_id: gateId, origin, expires_at: new Date(Date.now() + 120_000), spent_at: null };
    txUnsafe.mockResolvedValueOnce([record]).mockResolvedValueOnce([]);
    expect(await store.consume(claim)).toEqual({ ok: false, error: "CHALLENGE_SPENT" });
    expect(txUnsafe.mock.calls.filter(([query]) => String(query).startsWith("update"))).toHaveLength(0);
  });
});
