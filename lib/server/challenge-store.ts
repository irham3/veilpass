import "server-only";

import { createHash, randomBytes as nodeRandomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import type { VeilPassErrorCode } from "@/packages/shared/src/contracts";

type StoredChallenge = { challengeDigest: string; gateId: string; origin: string; expiresAtMs: number; spent: boolean };
type ConsumeResult = { ok: true } | { ok: false; error: VeilPassErrorCode };

export type IssuedChallenge = { challengeId: string; challenge: string; gateId: string; origin: string; expiresAt: string };

export class ChallengeStore {
  private challenges = new Map<string, StoredChallenge>();
  private nullifiers = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  private readonly now: () => number;
  private readonly randomBytes: () => Uint8Array;

  constructor(options: { now?: () => number; randomBytes?: () => Uint8Array } = {}) {
    this.now = options.now ?? Date.now;
    this.randomBytes = options.randomBytes ?? (() => nodeRandomBytes(32));
  }

  async issue({ gateId, origin }: { gateId: string; origin: string }): Promise<IssuedChallenge> {
    const raw = Buffer.from(this.randomBytes());
    if (raw.byteLength !== 32) throw new Error("Challenge entropy source must return exactly 32 bytes");
    const challengeId = randomUUID();
    const expiresAtMs = this.now() + 5 * 60_000;
    this.challenges.set(challengeId, { challengeDigest: digest(raw), gateId, origin, expiresAtMs, spent: false });
    return { challengeId, challenge: raw.toString("base64url"), gateId, origin, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  consume(input: { challengeId: string; challengeHash: string; gateId: string; origin: string; loginNullifier: string }): Promise<ConsumeResult> {
    return this.atomic(() => {
      const record = this.challenges.get(input.challengeId);
      if (!record) return { ok: false, error: "PROOF_INVALID" };
      if (record.spent || this.nullifiers.has(input.loginNullifier)) return { ok: false, error: "CHALLENGE_SPENT" };
      if (this.now() > record.expiresAtMs) return { ok: false, error: "CHALLENGE_EXPIRED" };
      if (input.origin !== record.origin) return { ok: false, error: "ORIGIN_MISMATCH" };
      if (input.gateId !== record.gateId) return { ok: false, error: "GATE_MISMATCH" };
      const supplied = Buffer.from(input.challengeHash);
      const expected = Buffer.from(record.challengeDigest);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return { ok: false, error: "PROOF_INVALID" };
      record.spent = true;
      this.nullifiers.add(input.loginNullifier);
      return { ok: true };
    });
  }

  inspectForTest(challengeId: string): StoredChallenge | undefined { return this.challenges.get(challengeId); }

  private async atomic<T>(operation: () => T): Promise<T> {
    const before = this.queue;
    let release = () => {};
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await before;
    try { return operation(); } finally { release(); }
  }
}

function digest(value: Uint8Array | string): string { return createHash("sha256").update(value).digest("hex"); }

declare global { var veilPassChallengeStore: ChallengeStore | undefined; }
export const challengeStore = globalThis.veilPassChallengeStore ?? new ChallengeStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassChallengeStore = challengeStore;
