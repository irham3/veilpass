import { describe, expect, it } from "vitest";

import { magneticSnapPoint } from "@/lib/scroll-magnet";

describe("magneticSnapPoint", () => {
  it("settles on an anchor when the reader stops close to it", () => {
    expect(magneticSnapPoint(0.516, [0, 0.5, 0.8, 1])).toBe(0.5);
  });

  it("keeps native scroll position when no anchor is nearby", () => {
    expect(magneticSnapPoint(0.65, [0, 0.5, 0.8, 1])).toBe(0.65);
  });

  it("does not alter progress when there are no anchors", () => {
    expect(magneticSnapPoint(0.42, [])).toBe(0.42);
  });
});
