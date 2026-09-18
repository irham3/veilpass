import { describe, expect, it } from "vitest";

import { absoluteUrl, landingFaqItems, seoKeywords, siteConfig } from "./seo";

describe("public metadata", () => {
  it("builds canonical HTTPS URLs without losing paths", () => {
    expect(absoluteUrl()).toBe("https://veilpass.dev/");
    expect(absoluteUrl("/docs/privacy-model")).toBe("https://veilpass.dev/docs/privacy-model");
  });

  it("keeps searchable product and privacy language present", () => {
    expect(siteConfig.description).toMatch(/without receiving the user's Stellar wallet address/i);
    expect(seoKeywords).toContain("private wallet login");
    expect(landingFaqItems.some((item) => /anonymous/i.test(item.question))).toBe(true);
  });
});
