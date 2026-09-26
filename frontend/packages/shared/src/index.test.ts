import { describe, expect, it } from "vitest";

import { canonicalFieldHex, normalizeOrigin, publicInputsSchema } from "./index";

describe("shared package public entry point", () => {
  it("exports canonical field, origin, and protocol contracts", () => {
    expect(canonicalFieldHex("0x2A")).toBe("0".repeat(62) + "2a");
    expect(normalizeOrigin("https://APP-A.VEILPASS.DEV/")).toBe("https://app-a.veilpass.dev");
    expect(publicInputsSchema.safeParse({
      gateId: "premium-holder", epoch: 1, origin: "https://app-a.veilpass.dev", challengeHash: "hash",
      credentialCommitment: "commitment", credentialRoot: "root", privateAppId: "private-id",
      loginNullifier: "nullifier", revocationHash: "revocation", proofCreatedAt: "2026-09-26T00:00:00.000Z",
      proofExpiresAt: "2026-09-26T00:05:00.000Z",
    }).success).toBe(true);
  });
});
