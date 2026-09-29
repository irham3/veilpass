import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sql, txUnsafe } = vi.hoisted(() => {
  const txUnsafe = vi.fn();
  const sql = Object.assign(vi.fn(), { begin: vi.fn(), unsafe: vi.fn() });
  return { sql, txUnsafe };
});
vi.mock("postgres", () => ({ default: vi.fn(() => sql) }));

import { PostgresDemoAssetClaimStore } from "./demo-asset-claim-store";

const claimInput = { address: "GTESTHOLDER", origin: "https://login.veilpass.dev", assetCode: "VPT", assetIssuer: "GISSUER", amount: "1" };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

beforeEach(() => {
  sql.mockReset().mockResolvedValue([]);
  txUnsafe.mockReset();
  sql.begin.mockReset().mockImplementation(async (callback: (tx: { unsafe: typeof txUnsafe }) => Promise<unknown>) => callback({ unsafe: txUnsafe }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("PostgreSQL demo-asset claim adapter", () => {
  it("stores only address/message digests, atomically reserves once, and records outcomes", async () => {
    const store = new PostgresDemoAssetClaimStore("postgresql://test.invalid/db");
    const challenge = await store.issue(claimInput);
    const inserted = sql.mock.calls[0];
    expect(String(inserted[0])).toContain("insert into veilpass.demo_asset_claim_challenges");
    expect(inserted).toContain(digest(claimInput.address));
    expect(inserted).toContain(digest(challenge.message));
    expect(inserted).not.toContain(claimInput.address);
    expect(inserted).not.toContain(challenge.message);

    txUnsafe.mockImplementation(async (query: string) => {
      if (query.includes("from veilpass.demo_asset_claim_challenges")) return [{ address_digest: digest(claimInput.address), message_digest: digest(challenge.message), expires_at: new Date(challenge.expiresAt), spent: false }];
      if (query.includes("from veilpass.demo_asset_claims where address_digest")) return [];
      if (query.includes("count(*)")) return [{ total: "0" }];
      return [];
    });
    const result = await store.consumeAndReserve({ challengeId: challenge.challengeId, address: claimInput.address, message: challenge.message, dailyLimit: 3 });
    expect(result.kind).toBe("reserved");
    if (result.kind !== "reserved") throw new Error("Expected a reservation");
    expect(txUnsafe.mock.calls.map(([query]) => String(query))).toEqual(expect.arrayContaining([
      expect.stringContaining("for update"),
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("set spent = true"),
      expect.stringContaining("status, reservation_id"),
    ]));

    await store.markIssued({ address: claimInput.address, reservationId: result.reservationId, transactionHash: "tx-hash" });
    await store.markIssued({ address: claimInput.address, reservationId: result.reservationId });
    await store.markUnknown({ address: claimInput.address, reservationId: result.reservationId });
    expect(sql.mock.calls.slice(-3).map(([query]) => String(query))).toEqual(expect.arrayContaining([
      expect.stringContaining("status = 'issued'"),
      expect.stringContaining("status = 'unknown'"),
    ]));
    expect(sql.mock.calls.at(-2)).toContain(null);
  });

  it("rejects missing, spent, expired, and mismatched challenge records", async () => {
    const store = new PostgresDemoAssetClaimStore("postgresql://test.invalid/db");
    const challenge = await store.issue(claimInput);
    const record = { address_digest: digest(claimInput.address), message_digest: digest(challenge.message), expires_at: new Date(challenge.expiresAt), spent: false };
    const cases = [
      undefined,
      { ...record, spent: true },
      { ...record, expires_at: new Date(0) },
      { ...record, address_digest: digest("different") },
      { ...record, message_digest: digest("different") },
    ];
    for (const value of cases) {
      txUnsafe.mockReset().mockResolvedValueOnce(value ? [value] : []);
      await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address: claimInput.address, message: challenge.message, dailyLimit: 2 })).resolves.toEqual({ kind: "challenge_invalid" });
      expect(txUnsafe).toHaveBeenCalledOnce();
    }
  });

  it("rejects duplicate wallets and a depleted daily cap before consuming the challenge", async () => {
    const store = new PostgresDemoAssetClaimStore("postgresql://test.invalid/db");
    const challenge = await store.issue(claimInput);
    const record = { address_digest: digest(claimInput.address), message_digest: digest(challenge.message), expires_at: new Date(challenge.expiresAt), spent: false };

    txUnsafe.mockImplementation(async (query: string) => query.includes("from veilpass.demo_asset_claim_challenges")
      ? [record]
      : query.includes("select address_digest from veilpass.demo_asset_claims")
        ? [{ address_digest: digest(claimInput.address) }]
        : []);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address: claimInput.address, message: challenge.message, dailyLimit: 2 })).resolves.toEqual({ kind: "already_claimed" });

    txUnsafe.mockReset().mockImplementation(async (query: string) => query.includes("from veilpass.demo_asset_claim_challenges")
      ? [record]
      : query.includes("select count(*)")
        ? [{ total: "2" }]
        : []);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address: claimInput.address, message: challenge.message, dailyLimit: 2 })).resolves.toEqual({ kind: "limit_reached" });
    expect(txUnsafe.mock.calls.map(([query]) => String(query))).not.toContain(expect.stringContaining("set spent = true"));

    txUnsafe.mockReset().mockImplementation(async (query: string) => query.includes("from veilpass.demo_asset_claim_challenges") ? [record] : []);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address: claimInput.address, message: challenge.message, dailyLimit: 0 })).resolves.toEqual({ kind: "limit_reached" });
  });
});
