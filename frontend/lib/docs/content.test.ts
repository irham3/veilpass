import { describe, expect, it } from "vitest";

import { docNav, docs } from "./content";

describe("documentation content registry", () => {
  it("keeps every navigation item backed by a complete, renderable page", () => {
    for (const [slug, label] of docNav) {
      const page = docs[slug];
      expect(page, `${label} (${slug})`).toBeDefined();
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.intro.length).toBeGreaterThan(20);
      expect(page.sections.length).toBeGreaterThan(0);
      for (const section of page.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(20);
      }
    }
  });

  it("documents the privacy limitation and trusted server boundary", () => {
    expect(docs.privacy.sections.map((section) => section.body).join(" ")).toMatch(/not a network anonymity system/i);
    expect(docs.server.sections.map((section) => section.body).join(" ")).toMatch(/never raw verifier diagnostics/i);
    expect(docs.privacy.sections.map((section) => section.body).join(" ")).toMatch(/host's POST \/api\/verify route .* receive the raw proof and public inputs/i);
    expect(docs.api.sections.map((section) => section.heading)).toContain("GET /api/session");
    expect(docs.api.sections.map((section) => section.heading)).not.toContain("POST /api/session");
  });
});
