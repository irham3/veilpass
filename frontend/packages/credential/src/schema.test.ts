import { describe, expect, it } from "vitest";

import { issuedCredentialSchema, storedCredentialSchema } from "./schema";

const field = "ab".repeat(32);

function issuedCredential() {
  return {
    gateId: "premium-holder",
    epoch: 1,
    commitment: field,
    credentialSalt: field,
    credentialRoot: field,
    leafNonce: field,
    merklePath: Array.from({ length: 16 }, () => field),
    pathIsRight: Array.from({ length: 16 }, () => false),
    revocationHash: field,
    expiresAt: "2030-01-01T00:00:00.000Z",
    issuerPublicKey: "GISSUER",
    issuerSignature: "signature",
  };
}

describe("credential schemas", () => {
  it("accepts and preserves the leaf index returned by issuance and witness refresh", () => {
    const parsed = storedCredentialSchema.parse({
      ...issuedCredential(),
      leafIndex: 7,
      subjectSecret: field,
      storedAt: "2026-09-22T00:00:00.000Z",
    });

    expect(parsed.leafIndex).toBe(7);
  });

  it("keeps credentials stored before the leaf-index field backward compatible", () => {
    expect(issuedCredentialSchema.safeParse(issuedCredential()).success).toBe(true);
  });

  it("continues to reject unrelated credential fields", () => {
    expect(issuedCredentialSchema.safeParse({ ...issuedCredential(), unexpected: true }).success).toBe(false);
  });
});
