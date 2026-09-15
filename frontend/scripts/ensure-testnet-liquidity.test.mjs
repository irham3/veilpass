import { describe, expect, it } from "vitest";

import { findMatchingOffer } from "./ensure-testnet-liquidity.mjs";

describe("findMatchingOffer", () => {
  it("finds only the VPT offer selling into native XLM", () => {
    const offers = [
      {
        id: "wrong-direction",
        selling: { asset_type: "native" },
        buying: { asset_code: "VPT", asset_issuer: "GISSUER" },
      },
      {
        id: "vpt-xlm",
        selling: { asset_code: "VPT", asset_issuer: "GISSUER" },
        buying: { asset_type: "native" },
      },
    ];

    expect(findMatchingOffer(offers, "VPT", "GISSUER")?.id).toBe("vpt-xlm");
  });

  it("returns undefined when the issuer has no matching offer", () => {
    expect(findMatchingOffer([], "VPT", "GISSUER")).toBeUndefined();
  });
});
