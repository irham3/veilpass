import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DocsPage, { generateMetadata, generateStaticParams } from "./page";

describe("documentation article route", () => {
  it("lists valid static routes and generates canonical metadata for a topic", async () => {
    expect(generateStaticParams().some(({ slug }) => slug?.[0] === "privacy")).toBe(true);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: ["quickstart"] }) });
    expect(metadata.title).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/docs/quickstart");
    expect(metadata.openGraph?.images).toBeTruthy();
  });

  it("renders the overview article and topic code samples", async () => {
    const overview = await DocsPage({ params: Promise.resolve({}) });
    const overviewHtml = renderToStaticMarkup(overview);
    expect(overviewHtml).toContain("VeilPass");
    expect(overviewHtml).toContain("https://www.npmjs.com/package/@veilpass/sdk");
    expect(overviewHtml).toContain('rel="noopener noreferrer"');
    const topic = await DocsPage({ params: Promise.resolve({ slug: ["client"] }) });
    const html = renderToStaticMarkup(topic);
    expect(html).toContain("Client SDK");
    expect(html).toContain("<pre");
    expect(html).toContain("Copy</button>");
  });
});
