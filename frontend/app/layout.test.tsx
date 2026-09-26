import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ variable: "font-instrument" }),
  IBM_Plex_Mono: () => ({ variable: "font-mono" }),
}));
vi.mock("@/components/motion/route-transition", () => ({ RouteTransition: ({ children }: { children: React.ReactNode }) => <div data-testid="route-transition">{children}</div> }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>VeilPass header</header> }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: ({ position }: { position: string }) => <div data-testid="toaster">{position}</div> }));
vi.mock("@/components/ui/tooltip", () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div> }));

import RootLayout, { metadata, viewport } from "./layout";

describe("root app layout", () => {
  it("sets the expected metadata and theme", () => {
    expect(metadata.applicationName).toBe("VeilPass");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(viewport.themeColor).toBe("#0B0F0E");
  });

  it("wraps content in shared navigation, tooltip, transition, and notification providers", async () => {
    const tree = await RootLayout({ children: <p>Page content</p> });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("VeilPass header");
    expect(html).toContain("Page content");
    expect(html).toContain("bottom-right");
    expect(mocks.connection).toHaveBeenCalledOnce();
  });
});
