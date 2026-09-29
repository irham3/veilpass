import { describe, expect, it } from "vitest";

import { createSimulatedProof, verifySimulatedProof } from "./simulated";

const publicInputs = {
  gateId: "premium-holder", epoch: 1, origin: "https://app.example", challengeHash: "01", credentialCommitment: "02",
  credentialRoot: "03", privateAppId: "04", loginNullifier: "05", revocationHash: "06",
  proofCreatedAt: "2026-09-29T00:00:00.000Z", proofExpiresAt: "2026-09-29T00:01:00.000Z",
};

describe("simulated proof authentication", () => {
  it("authenticates a canonical proof and rejects altered, truncated, or unknown proofs", () => {
    const proofResult = createSimulatedProof({ challengeId: "challenge-1", publicInputs, key: "test-only-secret" });
    expect(verifySimulatedProof({ proofResult, key: "test-only-secret" })).toBe(true);
    expect(verifySimulatedProof({ proofResult, key: "different-secret" })).toBe(false);
    expect(verifySimulatedProof({ proofResult: { ...proofResult, challengeId: "challenge-2" }, key: "test-only-secret" })).toBe(false);
    expect(verifySimulatedProof({ proofResult: { ...proofResult, proof: "unknown.proof" }, key: "test-only-secret" })).toBe(false);
  });
});
