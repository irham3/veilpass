import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => ({ ImageResponse: class ImageResponse { constructor(readonly content: React.ReactNode, readonly options: unknown) {} } }));

import AppleIcon, { contentType as appleContentType, size as appleSize } from "./apple-icon";
import Loading from "./loading";
import manifest from "./manifest";
import TwitterImage, { alt, contentType, size } from "./twitter-image";

describe("metadata and app-shell routes", () => {
  it("exposes an installable manifest with all declared icon purposes", () => {
    const data = manifest();
    expect(data.name).toBe("VeilPass");
    expect(data.display).toBe("standalone");
    expect(data.icons).toHaveLength(3);
    expect(data.icons?.map((icon) => icon.purpose)).toContain("maskable");
  });

  it("renders an accessible loading shell and returns both image payloads", () => {
    expect(renderToStaticMarkup(<Loading />)).toContain("bg-ink-950");
    const apple = AppleIcon() as unknown as { options: { width: number; height: number } };
    const og = TwitterImage() as unknown as { options: { width: number; height: number } };
    expect(appleContentType).toBe("image/png");
    expect(appleSize).toEqual({ width: 180, height: 180 });
    expect(apple.options).toEqual(appleSize);
    expect(contentType).toBe("image/png");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(alt).toMatch(/wallet/i);
    expect(og.options).toEqual(size);
  });
});
