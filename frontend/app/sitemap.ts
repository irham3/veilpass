import type { MetadataRoute } from "next";

import { docNav } from "@/lib/docs/content";
import { absoluteUrl } from "@/lib/seo";

const lastModified = new Date("2026-08-02T00:00:00.000Z");

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
