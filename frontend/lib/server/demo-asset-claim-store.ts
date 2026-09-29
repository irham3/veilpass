import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import postgres from "postgres";

type IssueInput = { address: string; origin: string; assetCode: string; assetIssuer: string; amount: string };
type ConsumeInput = { challengeId: string; address: string; message: string; dailyLimit: number };
export type DemoAssetChallenge = { challengeId: string; message: string; expiresAt: string };
export type ReserveResult = { kind: "reserved"; reservationId: string } | { kind: "challenge_invalid" } | { kind: "already_claimed" } | { kind: "limit_reached" };

export interface DemoAssetClaimStoreLike {
  issue(input: IssueInput): Promise<DemoAssetChallenge>;
  consumeAndReserve(input: ConsumeInput): Promise<ReserveResult>;
  markIssued(input: { address: string; reservationId: string; transactionHash?: string }): Promise<void>;
  markUnknown(input: { address: string; reservationId: string }): Promise<void>;
}

type ChallengeRecord = { address: string; message: string; expiresAtMs: number; spent: boolean };
type ClaimRecord = { status: "pending" | "issued" | "unknown"; reservationId: string; reservedAtMs: number; transactionHash?: string };

function messageFor({ address, origin, assetCode, assetIssuer, amount, nonce }: IssueInput & { nonce: string }) {
  return `VeilPass demo asset claim\norigin:${origin}\nwallet:${address}\nasset:${assetCode}:${assetIssuer}\namount:${amount}\nnonce:${nonce}`;
}

export class DemoAssetClaimStore implements DemoAssetClaimStoreLike {
  private challenges = new Map<string, ChallengeRecord>();
  private claims = new Map<string, ClaimRecord>();

  async issue(input: IssueInput): Promise<DemoAssetChallenge> {
    const challengeId = randomUUID();
    const expiresAtMs = Date.now() + 5 * 60_000;
    const message = messageFor({ ...input, nonce: randomBytes(32).toString("base64url") });
    this.challenges.set(challengeId, { address: input.address, message, expiresAtMs, spent: false });
    return { challengeId, message, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  async consumeAndReserve({ challengeId, address, message, dailyLimit }: ConsumeInput): Promise<ReserveResult> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.spent || challenge.expiresAtMs <= Date.now() || !safeEqual(challenge.address, address) || !safeEqual(challenge.message, message)) return { kind: "challenge_invalid" };
    const addressDigest = digest(address);
    if (this.claims.has(addressDigest)) return { kind: "already_claimed" };
    const cutoff = Date.now() - 24 * 60 * 60_000;
    const recentlyReserved = [...this.claims.values()].filter((claim) => claim.reservedAtMs >= cutoff).length;
    if (recentlyReserved >= dailyLimit) return { kind: "limit_reached" };
    const reservationId = randomUUID();
    challenge.spent = true;
    this.claims.set(addressDigest, { status: "pending", reservationId, reservedAtMs: Date.now() });
    return { kind: "reserved", reservationId };
  }

  async markIssued({ address, reservationId, transactionHash }: { address: string; reservationId: string; transactionHash?: string }) {
    const claim = this.claims.get(digest(address));
    if (!claim || claim.reservationId !== reservationId) return;
    claim.status = "issued";
    claim.transactionHash = transactionHash;
  }

  async markUnknown({ address, reservationId }: { address: string; reservationId: string }) {
    const claim = this.claims.get(digest(address));
    if (!claim || claim.reservationId !== reservationId || claim.status !== "pending") return;
    claim.status = "unknown";
  }
}

export class PostgresDemoAssetClaimStore implements DemoAssetClaimStoreLike {
  private sql: ReturnType<typeof postgres>;

  constructor(url: string) { this.sql = postgres(url, { max: 6, idle_timeout: 20, prepare: false }); }

  async issue(input: IssueInput): Promise<DemoAssetChallenge> {
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const message = messageFor({ ...input, nonce: randomBytes(32).toString("base64url") });
    await this.sql`insert into veilpass.demo_asset_claim_challenges (id, address_digest, message_digest, expires_at) values (${challengeId}, ${digest(input.address)}, ${digest(message)}, ${expiresAt})`;
    return { challengeId, message, expiresAt: expiresAt.toISOString() };
  }

  async consumeAndReserve({ challengeId, address, message, dailyLimit }: ConsumeInput): Promise<ReserveResult> {
    const addressDigest = digest(address);
    return this.sql.begin(async (tx) => {
      const challenges = await tx.unsafe<{ address_digest: string; message_digest: string; expires_at: Date; spent: boolean }[]>("select address_digest, message_digest, expires_at, spent from veilpass.demo_asset_claim_challenges where id = $1 for update", [challengeId]);
      const challenge = challenges[0];
      if (!challenge || challenge.spent || challenge.expires_at.getTime() <= Date.now() || !safeEqual(challenge.address_digest, addressDigest) || !safeEqual(challenge.message_digest, digest(message))) return { kind: "challenge_invalid" };

      // Serialize the small Testnet faucet budget so concurrent serverless calls cannot exceed it.
      await tx.unsafe("select pg_advisory_xact_lock($1)", [918_274]);
      const existing = await tx.unsafe<{ address_digest: string }[]>("select address_digest from veilpass.demo_asset_claims where address_digest = $1 for update", [addressDigest]);
      if (existing[0]) return { kind: "already_claimed" };
      const usage = await tx.unsafe<{ total: string }[]>("select count(*)::text as total from veilpass.demo_asset_claims where reserved_at >= now() - interval '24 hours'", []);
      if (Number(usage[0]?.total ?? "0") >= dailyLimit) return { kind: "limit_reached" };

      const reservationId = randomUUID();
      await tx.unsafe("update veilpass.demo_asset_claim_challenges set spent = true where id = $1", [challengeId]);
      await tx.unsafe("insert into veilpass.demo_asset_claims (address_digest, status, reservation_id) values ($1, 'pending', $2)", [addressDigest, reservationId]);
      return { kind: "reserved", reservationId };
    });
  }

  async markIssued({ address, reservationId, transactionHash }: { address: string; reservationId: string; transactionHash?: string }) {
    await this.sql`update veilpass.demo_asset_claims set status = 'issued', transaction_hash = ${transactionHash ?? null}, updated_at = now() where address_digest = ${digest(address)} and reservation_id = ${reservationId} and status = 'pending'`;
  }

  async markUnknown({ address, reservationId }: { address: string; reservationId: string }) {
    await this.sql`update veilpass.demo_asset_claims set status = 'unknown', updated_at = now() where address_digest = ${digest(address)} and reservation_id = ${reservationId} and status = 'pending'`;
  }
}

function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function safeEqual(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }

export const durableDemoAssetClaimStoreConfigured = Boolean(process.env.DATABASE_URL);
declare global { var veilPassDemoAssetClaimStore: DemoAssetClaimStore | undefined; }
const memoryStore = globalThis.veilPassDemoAssetClaimStore ?? new DemoAssetClaimStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassDemoAssetClaimStore = memoryStore;
export const demoAssetClaimStore: DemoAssetClaimStoreLike = process.env.DATABASE_URL ? new PostgresDemoAssetClaimStore(process.env.DATABASE_URL) : memoryStore;
