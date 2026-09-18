import { describe, expect, it } from "vitest";

import { FREIGHTER_INSTALL_URL, isFreighterMissing } from "./enrollment-flow";

describe("Freighter enrollment recovery", () => {
  it("detects the missing-extension error", () => {
    expect(isFreighterMissing("Freighter was not found. Install or unlock Freighter, then try again.")).toBe(true);
    expect(isFreighterMissing("Wallet access was rejected.")).toBe(false);
  });

  it("uses the official Freighter install URL", () => {
    expect(FREIGHTER_INSTALL_URL).toBe("https://freighter.app/");
  });
});
