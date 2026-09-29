import { ImageResponse } from "next/og";
import { describe, expect, it } from "vitest";

import twitterImage, { alt, contentType, size } from "./twitter-image";

describe("Twitter image route metadata", () => {
  it("reuses the Open Graph image and its declared format", () => {
    expect(alt).toContain("VeilPass");
    expect(contentType).toBe("image/png");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(twitterImage()).toBeInstanceOf(ImageResponse);
  });
});
