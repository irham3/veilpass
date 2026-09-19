import { describe, expect, it } from "vitest";

import { enrollmentIssueMessage, FREIGHTER_INSTALL_URL, isFreighterMissing } from "./enrollment-flow";

describe("Freighter enrollment recovery", () => {
  it("detects the missing-extension error", () => {
    expect(isFreighterMissing("Freighter was not found. Install or unlock Freighter, then try again.")).toBe(true);
    expect(isFreighterMissing("Wallet access was rejected.")).toBe(false);
  });

  it("uses the official Freighter install URL", () => {
    expect(FREIGHTER_INSTALL_URL).toBe("https://freighter.app/");
  });

  it("turns enrollment API failures into actionable, non-alarming guidance", () => {
    expect(enrollmentIssueMessage("SERVICE_UNAVAILABLE", "req-123")).toContain("no funds were moved");
    expect(enrollmentIssueMessage("SERVICE_UNAVAILABLE", "req-123")).toContain("req-123");
    expect(enrollmentIssueMessage("CHALLENGE_SPENT")).toContain("fresh request");
    expect(enrollmentIssueMessage("PROOF_INVALID")).toContain("Freighter");
  });
});
