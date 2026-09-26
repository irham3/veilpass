import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/docs/docs-sidebar", () => ({ DocsSidebar: () => <aside>Docs navigation fixture</aside> }));

import DocsLayout from "./layout";

describe("documentation layout", () => {
  it("keeps the article and docs navigation in the responsive layout", () => {
    const html = renderToStaticMarkup(<DocsLayout><article>Article fixture</article></DocsLayout>);
    expect(html).toContain("Docs navigation fixture");
    expect(html).toContain("<main class=\"min-w-0\"><article>Article fixture</article></main>");
  });
});
