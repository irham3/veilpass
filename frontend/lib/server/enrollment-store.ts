import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import postgres from "postgres";

type IssueInput = { address: string; gateId: string; origin: string };
type ConsumeInput = { challengeId: string; address: string; message: string; gateId: string };
type IssuedEnrollmentChallenge = { challengeId: string; message: string; gateId: string; expiresAt: string };

export interface EnrollmentStoreLike {
  issue(input: IssueInput): Promise<IssuedEnrollmentChallenge>;
  consume(input: ConsumeInput): Promise<boolean>;
}

type Record = IssueInput & { message: string; expiresAtMs: number; spent: boolean };

export class EnrollmentStore implements EnrollmentStoreLike {
  private records = new Map<string, Record>();

  async issue({ address, gateId, origin }: IssueInput): Promise<IssuedEnrollmentChallenge> {
    const challengeId = randomUUID();
    const expiresAtMs = Date.now() + 5 * 60_000;
    const message = `VeilPass enrollment\norigin:${origin}\ngate:${gateId}\nnonce:${randomBytes(32).toString("base64url")}`;
    this.records.set(challengeId, { address, gateId, origin, message, expiresAtMs, spent: false });
    return { challengeId, message, gateId, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  async consume({ challengeId, address, message, gateId }: ConsumeInput): Promise<boolean> {
    const record = this.records.get(challengeId);
    if (!record || record.spent || record.expiresAtMs <= Date.now()) return false;
    if (record.gateId !== gateId || !safeEqual(record.address, address) || !safeEqual(record.message, message)) return false;
    record.spent = true;
    return true;
  }
}

export class PostgresEnrollmentStore implements EnrollmentStoreLike {
  private sql: ReturnType<typeof postgres>;

  constructor(url: string) { this.sql = postgres(url, { max: 6, idle_timeout: 20, prepare: false }); }

  async issue({ address, gateId, origin }: IssueInput): Promise<IssuedEnrollmentChallenge> {
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const message = `VeilPass enrollment\norigin:${origin}\ngate:${gateId}\nnonce:${randomBytes(32).toString("base64url")}`;
    await this.sql`insert into veilpass.enrollment_challenges (id, address_digest, message_digest, gate_id, expires_at) values (${challengeId}, ${digest(address)}, ${digest(message)}, ${gateId}, ${expiresAt})`;
    return { challengeId, message, gateId, expiresAt: expiresAt.toISOString() };
  }

  async consume({ challengeId, address, message, gateId }: ConsumeInput): Promise<boolean> {
    return this.sql.begin(async (tx) => {
      const rows = await tx.unsafe<{ address_digest: string; message_digest: string; gate_id: string; expires_at: Date; spent: boolean }[]>("select address_digest, message_digest, gate_id, expires_at, spent from veilpass.enrollment_challenges where id = $1 for update", [challengeId]);
      const record = rows[0];
      if (!record || record.spent || record.expires_at.getTime() <= Date.now()) return false;
      if (record.gate_id !== gateId || !safeEqual(record.address_digest, digest(address)) || !safeEqual(record.message_digest, digest(message))) return false;
      await tx.unsafe("update veilpass.enrollment_challenges set spent = true where id = $1", [challengeId]);
      return true;
    });
  }
}

function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function safeEqual(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }

export const durableEnrollmentStoreConfigured = Boolean(process.env.DATABASE_URL);
declare global { var veilPassEnrollmentStore: EnrollmentStore | undefined; }
const memoryStore = globalThis.veilPassEnrollmentStore ?? new EnrollmentStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassEnrollmentStore = memoryStore;
export const enrollmentStore: EnrollmentStoreLike = process.env.DATABASE_URL ? new PostgresEnrollmentStore(process.env.DATABASE_URL) : memoryStore;
