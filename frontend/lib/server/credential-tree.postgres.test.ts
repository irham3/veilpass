import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { api, connectionUnsafe, sql, txUnsafe } = vi.hoisted(() => {
  const api = { pedersenHash: vi.fn() };
  const connectionUnsafe = vi.fn();
  const txUnsafe = vi.fn();
  const connection = { unsafe: connectionUnsafe, release: vi.fn() };
  const sql = Object.assign(vi.fn(), {
    begin: vi.fn(),
    reserve: vi.fn(async () => connection),
    unsafe: vi.fn(),
    connection,
  });
  return { api, connectionUnsafe, sql, txUnsafe };
});
vi.mock("postgres", () => ({ default: vi.fn(() => sql) }));
vi.mock("@aztec/bb.js", () => ({ BarretenbergSync: { new: vi.fn(async () => api) } }));

import { CREDENTIAL_TREE_DEPTH, PostgresCredentialTreeStore } from "./credential-tree";

const issueInput = {
  gateId: "premium-holder",
  epoch: 1,
  credentialCommitment: `${"00".repeat(31)}01`,
  credentialSalt: `${"00".repeat(31)}02`,
  expiresAt: "2030-01-01T00:00:00.000Z",
  expectedRoot: "00".repeat(32),
  publishRoot: vi.fn(async () => undefined),
};

beforeEach(() => {
  vi.resetModules();
  vi.useRealTimers();
  api.pedersenHash.mockReset().mockImplementation(() => {
    const hash = new Uint8Array(32);
    hash[31] = 1;
    return { hash };
  });
  connectionUnsafe.mockReset().mockResolvedValue([]);
  txUnsafe.mockReset().mockResolvedValue([]);
  sql.mockReset().mockResolvedValue([]);
  sql.reserve.mockReset().mockResolvedValue(sql.connection);
  sql.connection.release.mockReset();
  sql.begin.mockReset().mockImplementation(async (callback: (tx: { unsafe: typeof txUnsafe }) => Promise<unknown>) => callback({ unsafe: txUnsafe }));
  sql.unsafe.mockReset().mockResolvedValue([]);
  issueInput.publishRoot.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.useRealTimers();
});

describe("PostgreSQL credential Merkle tree", () => {
  it("locks a gate, publishes before persisting, returns the witness, and reloads it", async () => {
    const persistedNodes: Array<{ level: number; node_index: number; node_value: string }> = [];
    txUnsafe.mockImplementation(async (query: string, params: unknown[]) => {
      if (query.includes("credential_tree_nodes")) persistedNodes.push({ level: Number(params[1]), node_index: Number(params[2]), node_value: String(params[3]) });
      return [];
    });
    sql.unsafe.mockImplementation(async (query: string) => query.includes("credential_tree_nodes") ? persistedNodes : []);
    const store = new PostgresCredentialTreeStore("postgresql://test.invalid/db");
    const witness = await store.issue(issueInput);

    expect(connectionUnsafe.mock.calls[0][0]).toContain("pg_advisory_lock");
    expect(issueInput.publishRoot).toHaveBeenCalledOnce();
    expect(witness.credentialRoot).toBe(`${"00".repeat(31)}01`);
    expect(witness.merklePath).toHaveLength(CREDENTIAL_TREE_DEPTH);
    expect(sql.begin).toHaveBeenCalledOnce();
    expect(txUnsafe.mock.calls.at(-1)?.[0]).toContain("credential_merkle_credentials");
    expect(connectionUnsafe.mock.calls.at(-1)?.[0]).toContain("pg_advisory_unlock");
    expect(sql.connection.release).toHaveBeenCalledOnce();

    const [credentialInsert] = txUnsafe.mock.calls.at(-1)!;
    const values = txUnsafe.mock.calls.at(-1)![1] as unknown[];
    const record = { commitment: values[0], epoch: values[2], expires_at: values[3], credential_salt: values[4], leaf_nonce: values[5], revocation_hash: values[6], leaf_index: values[7] };
    sql.unsafe.mockImplementation(async (query: string) => query.includes("select commitment") ? [record] : persistedNodes);
    await expect(store.witnessForCredential({ gateId: issueInput.gateId, credentialCommitment: issueInput.credentialCommitment, expectedRoot: witness.credentialRoot })).resolves.toMatchObject({
      credentialRoot: witness.credentialRoot,
      leafNonce: witness.leafNonce,
      revocationHash: witness.revocationHash,
    });
    expect(String(credentialInsert)).toContain("credential_merkle_credentials");
  });

  it("fails closed for unsynchronized trees and skips missing, expired, or root-mismatched witnesses", async () => {
    const store = new PostgresCredentialTreeStore("postgresql://test.invalid/db");
    connectionUnsafe.mockImplementation(async (query: string) => query.includes("credential_tree_nodes") ? [{ level: CREDENTIAL_TREE_DEPTH, node_index: 0, node_value: `${"00".repeat(31)}03` }] : []);
    await expect(store.issue(issueInput)).rejects.toMatchObject({ name: "CredentialTreeIssueError", stage: "load_tree" });

    sql.unsafe.mockResolvedValueOnce([]);
    await expect(store.witnessForCredential({ gateId: issueInput.gateId, credentialCommitment: issueInput.credentialCommitment, expectedRoot: issueInput.expectedRoot })).resolves.toBeNull();
    sql.unsafe.mockResolvedValueOnce([{ commitment: issueInput.credentialCommitment, epoch: 1, expires_at: new Date(0), credential_salt: issueInput.credentialSalt, leaf_nonce: `${"00".repeat(31)}03`, revocation_hash: `${"00".repeat(31)}04`, leaf_index: 0 }]);
    await expect(store.witnessForCredential({ gateId: issueInput.gateId, credentialCommitment: issueInput.credentialCommitment, expectedRoot: issueInput.expectedRoot })).resolves.toBeNull();
    sql.unsafe.mockResolvedValueOnce([{ commitment: issueInput.credentialCommitment, epoch: 1, expires_at: new Date("2030-01-01"), credential_salt: issueInput.credentialSalt, leaf_nonce: `${"00".repeat(31)}03`, revocation_hash: `${"00".repeat(31)}04`, leaf_index: 0 }]).mockResolvedValueOnce([]);
    await expect(store.witnessForCredential({ gateId: issueInput.gateId, credentialCommitment: issueInput.credentialCommitment, expectedRoot: `${"00".repeat(31)}02` })).resolves.toBeNull();
  });

  it("compensates a published root on persistence failure and reports rollback failure", async () => {
    const store = new PostgresCredentialTreeStore("postgresql://test.invalid/db");
    sql.begin.mockRejectedValueOnce(new Error("database write failed"));
    await expect(store.issue(issueInput)).rejects.toMatchObject({ name: "CredentialTreeIssueError", stage: "persist_tree", reason: "database write failed" });
    expect(issueInput.publishRoot).toHaveBeenNthCalledWith(2, issueInput.expectedRoot);
    expect(connectionUnsafe.mock.calls.at(-1)?.[0]).toContain("pg_advisory_unlock");
    expect(sql.connection.release).toHaveBeenCalledOnce();

    issueInput.publishRoot.mockReset().mockRejectedValueOnce(new Error("first publish failed"));
    await expect(store.issue(issueInput)).rejects.toMatchObject({ stage: "publish_contract_root" });
    expect(issueInput.publishRoot).toHaveBeenCalledOnce();

    sql.begin.mockRejectedValueOnce(new Error("database write failed"));
    issueInput.publishRoot.mockReset().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("rollback failed"));
    await expect(store.issue(issueInput)).rejects.toMatchObject({ stage: "rollback_contract_root" });
  });

  it("reports connection and lock failures while always releasing acquired connections", async () => {
    const store = new PostgresCredentialTreeStore("postgresql://test.invalid/db");
    sql.reserve.mockRejectedValueOnce("offline");
    await expect(store.issue(issueInput)).rejects.toMatchObject({ name: "CredentialTreeIssueError", stage: "reserve_connection", reason: "non_error_throw" });

    connectionUnsafe.mockRejectedValueOnce(new Error("lock unavailable"));
    await expect(store.issue(issueInput)).rejects.toMatchObject({ stage: "acquire_gate_lock" });
    expect(sql.connection.release).toHaveBeenCalledOnce();
    expect(connectionUnsafe.mock.calls.filter(([query]) => String(query).includes("advisory_unlock"))).toHaveLength(0);
  });

  it("treats an advisory unlock failure as cleanup-only and still releases the connection", async () => {
    connectionUnsafe.mockImplementation(async (query: string) => query.includes("pg_advisory_unlock") ? Promise.reject(new Error("connection closed")) : []);
    const store = new PostgresCredentialTreeStore("postgresql://test.invalid/db");
    await expect(store.issue(issueInput)).resolves.toMatchObject({ credentialRoot: `${"00".repeat(31)}01` });
    expect(sql.connection.release).toHaveBeenCalledOnce();
  });
});
