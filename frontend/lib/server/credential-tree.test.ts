import { describe, expect, it } from "vitest";

import { CredentialTreeIssueError, credentialLeaf, merkleWitnessForLeaf, InMemoryCredentialTreeStore } from "./credential-tree";

const zero = "00".repeat(32);
const expiry = "2027-01-01T00:00:00.000Z";

describe("credential Merkle tree", () => {
  it("marks durable issuance failures with a safe operational stage", () => {
    const error = new CredentialTreeIssueError("persist_tree", "database write failed");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CredentialTreeIssueError");
    expect(error.stage).toBe("persist_tree");
    expect(error.reason).toBe("database write failed");
  });

  it("publishes a new root before committing an issued witness and refreshes old paths", async () => {
    const store = new InMemoryCredentialTreeStore();
    let root = zero;
    const first = await store.issue({
      gateId: "premium-holder",
      epoch: 1,
      credentialCommitment: "01".padStart(64, "0"),
      credentialSalt: "02".padStart(64, "0"),
      expiresAt: expiry,
      expectedRoot: root,
      publishRoot: async (next) => { root = next; },
    });
    expect(first.credentialRoot).toBe(root);
    expect(first.merklePath).toHaveLength(16);
    expect(first.pathIsRight).toHaveLength(16);

    const second = await store.issue({
      gateId: "premium-holder",
      epoch: 1,
      credentialCommitment: "03".padStart(64, "0"),
      credentialSalt: "04".padStart(64, "0"),
      expiresAt: expiry,
      expectedRoot: root,
      publishRoot: async (next) => { root = next; },
    });
    expect(second.credentialRoot).toBe(root);
    expect(second.credentialRoot).not.toBe(first.credentialRoot);

    const refreshed = await store.witnessForCredential({ gateId: "premium-holder", credentialCommitment: "01".padStart(64, "0"), expectedRoot: root });
    expect(refreshed).toMatchObject({ credentialRoot: root, leafNonce: first.leafNonce, revocationHash: first.revocationHash });
  });

  it("does not commit a leaf when publishing its root fails", async () => {
    const store = new InMemoryCredentialTreeStore();
    await expect(store.issue({
      gateId: "premium-holder",
      epoch: 1,
      credentialCommitment: "05".padStart(64, "0"),
      credentialSalt: "06".padStart(64, "0"),
      expiresAt: expiry,
      expectedRoot: zero,
      publishRoot: async () => { throw new Error("owner signature rejected"); },
    })).rejects.toThrow("owner signature rejected");
    await expect(store.witnessForCredential({ gateId: "premium-holder", credentialCommitment: "05".padStart(64, "0"), expectedRoot: zero })).resolves.toBeNull();
  });

  it("rejects stale roots and expired credentials before mutating the tree", async () => {
    const store = new InMemoryCredentialTreeStore();
    await expect(store.issue({ gateId: "premium-holder", epoch: 1, credentialCommitment: "07".padStart(64, "0"), credentialSalt: "08".padStart(64, "0"), expiresAt: expiry, expectedRoot: "01".repeat(32), publishRoot: async () => undefined })).rejects.toThrow("out of sync");
    await expect(store.issue({ gateId: "premium-holder", epoch: 1, credentialCommitment: "07".padStart(64, "0"), credentialSalt: "08".padStart(64, "0"), expiresAt: "2020-01-01T00:00:00.000Z", expectedRoot: zero, publishRoot: async () => undefined })).rejects.toThrow("future");
    await expect(store.witnessForCredential({ gateId: "premium-holder", credentialCommitment: "09".padStart(64, "0"), expectedRoot: zero })).resolves.toBeNull();

    const valid = await store.issue({ gateId: "premium-holder", epoch: 1, credentialCommitment: "0a".padStart(64, "0"), credentialSalt: "0b".padStart(64, "0"), expiresAt: expiry, expectedRoot: zero, publishRoot: async () => undefined });
    await expect(store.witnessForCredential({ gateId: "premium-holder", credentialCommitment: "0a".padStart(64, "0"), expectedRoot: "01".repeat(32) })).resolves.toBeNull();
    expect(valid.credentialRoot).not.toBe("01".repeat(32));
  });

  it("handles right-hand Merkle paths and validates numeric leaf inputs", async () => {
    const witness = await merkleWitnessForLeaf(new Map([["0:0", "01".padStart(64, "0")]]), 1, "02".padStart(64, "0"));
    expect(witness.pathIsRight[0]).toBe(true);
    await expect(credentialLeaf({ credentialCommitment: zero, gateIdHash: zero, epoch: -1, credentialExpirySeconds: 1, leafNonce: zero, revocationHash: zero })).rejects.toThrow();
  });
});
