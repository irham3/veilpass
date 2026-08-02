import { describe, expect, it } from "vitest";

import { buildIssuedCredentialPayload } from "./credential-issuance";

describe("buildIssuedCredentialPayload", () => {
  it("binds an issued credential to the current contract epoch and shared root", () => {
    expect(
      buildIssuedCredentialPayload({
        gateId: "premium-holder",
        commitment: "ab".repeat(32),
        issuerPublicKey: "GISSUER",
        policy: {
          active: true,
          epoch: 7,
          credentialRoot: "cd".repeat(32),
        },
        expiresAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toEqual({
      gateId: "premium-holder",
      epoch: 7,
      commitment: "ab".repeat(32),
      credentialRoot: "cd".repeat(32),
      expiresAt: "2026-09-01T00:00:00.000Z",
      issuerPublicKey: "GISSUER",
    });
  });

  it("refuses to issue against an inactive gate", () => {
    expect(() =>
      buildIssuedCredentialPayload({
        gateId: "premium-holder",
        commitment: "ab".repeat(32),
        issuerPublicKey: "GISSUER",
        policy: { active: false, epoch: 1, credentialRoot: "cd".repeat(32) },
        expiresAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toThrow("Gate is not active");
  });
});
