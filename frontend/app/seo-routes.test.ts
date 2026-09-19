import { describe, expect, it } from "vitest";

import { metadata as demoMetadata } from "./demo/page";
import robots from "./robots";
import sitemap from "./sitemap";
import { generateMetadata as generateDocsMetadata } from "./docs/[[...slug]]/page";

describe("public SEO routes", () => {
  it("publishes only canonical public marketing and documentation routes in the sitemap", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://veilpass.dev/");
    expect(urls).toContain("https://veilpass.dev/demo");
    expect(urls.some((url) => url.includes("/dashboard") || url.includes("/login"))).toBe(false);
    expect(entries.every((entry) => {
      const value = entry.lastModified;
      return (typeof value === "string" ? value : value?.toISOString()) === "2026-09-19T00:00:00.000Z";
    })).toBe(true);
  });

  it("lets crawlers reach public documentation while keeping credential routes private", () => {
    const policy = robots();
    expect(policy.sitemap).toBe("https://veilpass.dev/sitemap.xml");
    const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
    expect(rules[0]).toMatchObject({ disallow: ["/api/", "/login", "/dashboard"] });
  });

  it("sets an explicit 1200 by 630 social card for demo and documentation pages", async () => {
    expect(demoMetadata.openGraph?.images).toMatchObject([{ url: "/opengraph-image", width: 1200, height: 630 }]);
    expect(demoMetadata.twitter?.images).toEqual([{ url: "https://veilpass.dev/twitter-image", alt: expect.any(String) }]);

    const metadata = await generateDocsMetadata({ params: Promise.resolve({ slug: ["privacy"] }) });
    expect(metadata.openGraph?.images).toMatchObject([{ url: "/opengraph-image", width: 1200, height: 630 }]);
    expect(metadata.twitter?.images).toEqual([{ url: "https://veilpass.dev/twitter-image", alt: expect.any(String) }]);
  });
});
