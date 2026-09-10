import { describe, expect, it } from "vitest";

import { buildIssuedCredentialPayload } from "./credential-issuance";

describe("buildIssuedCredentialPayload", () => {
  it("binds an issued credential to the current contract epoch and shared root", () => {
    expect(
      buildIssuedCredentialPayload({
        gateId: "premium-holder",
        commitment: "ab".repeat(32),
        credentialSalt: "cd".repeat(32),
        witness: { credentialRoot: "ef".repeat(32), leafIndex: 7, leafNonce: "12".repeat(32), merklePath: Array.from({ length: 16 }, () => "00".repeat(32)), pathIsRight: Array.from({ length: 16 }, () => false), revocationHash: "34".repeat(32) },
        issuerPublicKey: "GISSUER",
        policy: {
          active: true,
          epoch: 7,
        },
        expiresAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toEqual({
      gateId: "premium-holder",
      epoch: 7,
      commitment: "ab".repeat(32),
      credentialSalt: "cd".repeat(32),
      credentialRoot: "ef".repeat(32),
      leafNonce: "12".repeat(32),
      merklePath: Array.from({ length: 16 }, () => "00".repeat(32)),
      pathIsRight: Array.from({ length: 16 }, () => false),
      revocationHash: "34".repeat(32),
      expiresAt: "2026-09-01T00:00:00.000Z",
      issuerPublicKey: "GISSUER",
    });
  });

  it("refuses to issue against an inactive gate", () => {
    expect(() =>
      buildIssuedCredentialPayload({
        gateId: "premium-holder",
        commitment: "ab".repeat(32),
        credentialSalt: "cd".repeat(32),
        witness: { credentialRoot: "ef".repeat(32), leafIndex: 7, leafNonce: "12".repeat(32), merklePath: Array.from({ length: 16 }, () => "00".repeat(32)), pathIsRight: Array.from({ length: 16 }, () => false), revocationHash: "34".repeat(32) },
        issuerPublicKey: "GISSUER",
        policy: { active: false, epoch: 1 },
        expiresAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toThrow("Gate is not active");
  });
});
