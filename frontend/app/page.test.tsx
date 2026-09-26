import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("landing page", () => {
  it("renders the developer entry point, privacy framing, docs links, and valid structured data", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Prove access. Keep wallets private.");
    expect(html).toContain("Hosts get a scoped ID and verdict, not the Stellar address.");
    expect(html).toContain('href="/docs/privacy"');
    const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    expect(jsonLd).toBeTruthy();
    expect(JSON.parse(jsonLd!)).toHaveLength(3);
  });
});
