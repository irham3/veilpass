import { describe, expect, it } from "vitest";

import {
  proofResultSchema,
  verifiedLoginSchema,
  verifyResultSchema,
} from "./contracts";

const verified = {
  ok: true as const,
  privateAppId: "vp_7f4e9d",
  gateId: "premium-holder",
  epoch: 3,
  origin: "https://app.example.com",
  expiresAt: "2026-08-02T01:05:00.000Z",
};

describe("host result schemas", () => {
  it("accepts the narrow verified login object", () => {
    expect(verifiedLoginSchema.parse(verified)).toEqual(verified);
  });

  it.each([
    "walletAddress",
    "walletBalance",
    "credentialCommitment",
    "revocationHash",
    "nullifier",
    "proof",
  ])("rejects forbidden host result field %s", (field) => {
    expect(() =>
      verifiedLoginSchema.parse({ ...verified, [field]: "sensitive" }),
    ).toThrow();
  });

  it("accepts a stable public error without an internal trace", () => {
    expect(
      verifyResultSchema.parse({
        ok: false,
        error: "CHALLENGE_SPENT",
        requestId: "req_456",
      }),
    ).toEqual({
      ok: false,
      error: "CHALLENGE_SPENT",
      requestId: "req_456",
    });
  });

  it("keeps the wallet address out of proof results", () => {
    expect(() =>
      proofResultSchema.parse({
        challengeId: "ch_123",
        proof: "fixture-proof",
        publicInputs: {
          gateId: "premium-holder",
          epoch: 3,
          origin: "https://app.example.com",
          challengeHash: "hash",
          credentialRoot: "root",
          privateAppId: "vp_7f4e9d",
          loginNullifier: "nullifier",
          revocationHash: "revocation",
          proofExpiresAt: "2026-08-02T01:05:00.000Z",
        },
        walletAddress: "GABC",
      }),
    ).toThrow();
  });
});
