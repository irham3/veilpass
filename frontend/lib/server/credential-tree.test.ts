import { describe, expect, it } from "vitest";

import { InMemoryCredentialTreeStore } from "./credential-tree";

const zero = "00".repeat(32);
const expiry = "2027-01-01T00:00:00.000Z";

describe("credential Merkle tree", () => {
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
});
