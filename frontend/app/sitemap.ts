import type { MetadataRoute } from "next";

import { docNav } from "@/lib/docs/content";
import { absoluteUrl } from "@/lib/seo";

// This is a release timestamp, not a generated "now" value: search engines
// should only see a sitemap change when the public content actually changed.
const lastModified = new Date("2026-09-19T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = docNav.map(([slug]) => ({
    url: absoluteUrl(`/docs${slug ? `/${slug}` : ""}`),
    lastModified,
    changeFrequency: "weekly" as const,
    priority: slug ? 0.72 : 0.82,
  }));

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/demo"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...docs,
    {
      url: absoluteUrl("/pricing.md"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.45,
    },
    {
      url: absoluteUrl("/llms.txt"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.45,
    },
  ];
}
