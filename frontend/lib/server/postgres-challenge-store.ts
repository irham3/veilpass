import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";

import type { ChallengeStoreLike, IssuedChallenge } from "./challenge-store";

export class PostgresChallengeStore implements ChallengeStoreLike {
  private sql: ReturnType<typeof postgres>;
  constructor(url: string) { this.sql = postgres(url, { max: 6, idle_timeout: 20, prepare: false }); }

  async issue({ gateId, origin }: { gateId: string; origin: string }): Promise<IssuedChallenge> {
    const challenge = randomBytes(32); const challengeId = randomUUID(); const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.sql`insert into veilpass.login_challenges (id, challenge_digest, gate_id, origin, expires_at) values (${challengeId}, ${digest(challenge)}, ${gateId}, ${origin}, ${expiresAt})`;
    return { challengeId, challenge: challenge.toString("base64url"), gateId, origin, expiresAt: expiresAt.toISOString() };
  }

  async consume(input: { challengeId: string; challengeHash: string; gateId: string; origin: string; loginNullifier: string }) {
    return this.sql.begin(async (tx) => {
      const rows = await tx.unsafe<{ challenge_digest: string; gate_id: string; origin: string; expires_at: Date; spent_at: Date | null }[]>("select challenge_digest, gate_id, origin, expires_at, spent_at from veilpass.login_challenges where id = $1 for update", [input.challengeId]);
      const record = rows[0];
      if (!record) return { ok: false as const, error: "PROOF_INVALID" as const };
      if (record.spent_at) return { ok: false as const, error: "CHALLENGE_SPENT" as const };
      if (record.expires_at.getTime() <= Date.now()) return { ok: false as const, error: "CHALLENGE_EXPIRED" as const };
      if (record.origin !== input.origin) return { ok: false as const, error: "ORIGIN_MISMATCH" as const };
      if (record.gate_id !== input.gateId) return { ok: false as const, error: "GATE_MISMATCH" as const };
      if (record.challenge_digest !== input.challengeHash) return { ok: false as const, error: "PROOF_INVALID" as const };
      const nullifier = digest(input.loginNullifier);
      const inserted = await tx.unsafe("insert into veilpass.login_nullifiers (digest) values ($1) on conflict do nothing returning digest", [nullifier]);
      if (inserted.length !== 1) return { ok: false as const, error: "CHALLENGE_SPENT" as const };
      await tx.unsafe("update veilpass.login_challenges set spent_at = now() where id = $1", [input.challengeId]);
      return { ok: true as const };
    });
  }
}

function digest(value: Uint8Array | string): string { return createHash("sha256").update(value).digest("hex"); }
