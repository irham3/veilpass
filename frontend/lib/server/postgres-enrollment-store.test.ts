import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sql, txUnsafe } = vi.hoisted(() => {
  const txUnsafe = vi.fn();
  const sql = Object.assign(vi.fn(), { begin: vi.fn(), unsafe: vi.fn() });
  return { sql, txUnsafe };
});
vi.mock("postgres", () => ({ default: vi.fn(() => sql) }));

import { PostgresEnrollmentStore } from "./enrollment-store";

const input = { address: "GTESTADDRESS", gateId: "premium-holder", origin: "https://login.veilpass.dev" };
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

beforeEach(() => {
  sql.mockReset().mockResolvedValue([]);
  sql.begin.mockReset().mockImplementation(async (callback: (tx: { unsafe: typeof txUnsafe }) => Promise<unknown>) => callback({ unsafe: txUnsafe }));
  txUnsafe.mockReset();
});

describe("PostgreSQL enrollment challenges", () => {
  it("stores digests rather than wallet address/message and consumes with a row lock", async () => {
    const store = new PostgresEnrollmentStore("postgresql://test.invalid/db");
    const issued = await store.issue(input);
    const insert = sql.mock.calls[0];
    expect(String(insert[0])).toContain("insert into veilpass.enrollment_challenges");
    expect(insert[1]).toBe(issued.challengeId);
    expect(insert[2]).toBe(sha256(input.address));
    expect(insert[3]).toBe(sha256(issued.message));
    expect(insert[2]).not.toBe(input.address);
    expect(insert[3]).not.toBe(issued.message);

    const record = { address_digest: insert[2], message_digest: insert[3], gate_id: input.gateId, expires_at: new Date(issued.expiresAt), spent: false };
    txUnsafe.mockImplementation(async (query: string) => {
      if (query.startsWith("select")) return [record];
      if (query.startsWith("update")) { record.spent = true; return []; }
      throw new Error("Unexpected SQL");
    });
    const claim = { challengeId: issued.challengeId, address: input.address, gateId: input.gateId, message: issued.message };
    expect(await store.consume({ ...claim, message: "wrong" })).toBe(false);
    expect(await store.consume({ ...claim, address: "wrong" })).toBe(false);
    expect(await store.consume({ ...claim, gateId: "wrong" })).toBe(false);
    expect(await store.consume(claim)).toBe(true);
    expect(await store.consume(claim)).toBe(false);
    expect(txUnsafe.mock.calls[0][0]).toContain("for update");
    expect(txUnsafe.mock.calls.filter(([query]) => String(query).startsWith("update"))).toHaveLength(1);
  });

  it("rejects missing and expired records without an update", async () => {
    const store = new PostgresEnrollmentStore("postgresql://test.invalid/db");
    txUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([{
      address_digest: sha256(input.address), message_digest: sha256("message"), gate_id: input.gateId,
      expires_at: new Date(0), spent: false,
    }]);
    const claim = { challengeId: "unused", address: input.address, gateId: input.gateId, message: "message" };
    expect(await store.consume(claim)).toBe(false);
    expect(await store.consume(claim)).toBe(false);
    expect(txUnsafe.mock.calls.filter(([query]) => String(query).startsWith("update"))).toHaveLength(0);
  });
});
