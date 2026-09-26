import { beforeEach, describe, expect, it, vi } from "vitest";

const { openDB, records, put, get, remove } = vi.hoisted(() => {
  const records = new Map<string, unknown>();
  const put = vi.fn(async (_store: string, value: unknown, key: string) => { records.set(key, structuredClone(value)); });
  const get = vi.fn(async (_store: string, key: string) => records.get(key));
  const remove = vi.fn(async (_store: string, key: string) => { records.delete(key); });
  const openDB = vi.fn(async (_name: string, _version: number, options: { upgrade: (database: { createObjectStore: (name: string) => void }) => void }) => {
    options.upgrade({ createObjectStore: vi.fn() });
    return { put, get, delete: remove };
  });
  return { openDB, records, put, get, remove };
});

vi.mock("idb", () => ({ openDB }));

import { deleteCredential, loadCredential, saveCredential } from "./store";

const credential = {
  gateId: "premium-holder",
  epoch: 2,
  commitment: "1".repeat(64),
  credentialSalt: "2".repeat(64),
  credentialRoot: "3".repeat(64),
  leafIndex: 4,
  leafNonce: "4".repeat(64),
  merklePath: Array(16).fill("5".repeat(64)),
  pathIsRight: Array(16).fill(false),
  revocationHash: "6".repeat(64),
  expiresAt: "2027-01-01T00:00:00.000Z",
  issuerPublicKey: "issuer-public-key",
  issuerSignature: "issuer-signature",
  subjectSecret: "local-only-secret",
  storedAt: "2026-09-26T00:00:00.000Z",
};

beforeEach(() => {
  records.clear();
  openDB.mockClear();
  put.mockClear();
  get.mockClear();
  remove.mockClear();
});

describe("browser credential storage", () => {
  it("validates and stores a credential under its gate ID in the versioned IndexedDB store", async () => {
    await saveCredential(credential);

    expect(openDB).toHaveBeenCalledWith("veilpass-credential-v1", 1, expect.objectContaining({ upgrade: expect.any(Function) }));
    expect(put).toHaveBeenCalledWith("credentials", credential, "premium-holder");
    expect(await loadCredential("premium-holder")).toEqual(credential);
  });

  it("rejects malformed credential data before writing to persistent storage", async () => {
    await expect(saveCredential({ ...credential, commitment: "not-a-field" })).rejects.toThrow();

    expect(put).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  });

  it("fails closed when a legacy or corrupt local record does not match the credential schema", async () => {
    records.set("premium-holder", { gateId: "premium-holder", subjectSecret: "partial" });

    await expect(loadCredential("premium-holder")).resolves.toBeNull();
    expect(get).toHaveBeenCalledWith("credentials", "premium-holder");
  });

  it("deletes only the requested gate credential", async () => {
    records.set("premium-holder", credential);
    records.set("members-only", { ...credential, gateId: "members-only" });

    await deleteCredential("premium-holder");

    expect(remove).toHaveBeenCalledWith("credentials", "premium-holder");
    expect(records.has("premium-holder")).toBe(false);
    expect(records.has("members-only")).toBe(true);
  });
});
