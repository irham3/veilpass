import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DemoPage, { metadata } from "./page";

describe("demo route", () => {
  it("renders the interactive two-host walkthrough and its live next steps", () => {
    const html = renderToStaticMarkup(DemoPage());
    expect(html).toContain("Watch one credential split clean.");
    expect(html).toContain("App A and App B receive different private IDs.");
    expect(html).toContain("Enroll with Freighter");
    expect(html).toContain("Open App A");
    expect(html).toContain("Open App B");
    expect(metadata.alternates?.canonical).toBe("/demo");
  });
});
