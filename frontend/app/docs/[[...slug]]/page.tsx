import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CodeBlock } from "@/components/docs/code-block";
import { docNav, docs } from "@/lib/docs/content";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export function generateStaticParams() { return docNav.map(([slug]) => ({ slug: slug ? [slug] : [] })); }

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug = [] } = await params;
  const key = slug[0] ?? "";
  const page = docs[key];
  if (!page) {
    return {};
  }

  const path = `/docs${key ? `/${key}` : ""}`;
  return {
    title: page.title,
    description: page.intro,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${page.title} | VeilPass docs`,
      description: page.intro,
      url: path,
      siteName: siteConfig.name,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | VeilPass docs`,
      description: page.intro,
      images: [{ url: absoluteUrl("/twitter-image"), alt: siteConfig.ogImageAlt }],
    },
  };
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const key = slug[0] ?? "";
  const page = docs[key];
  if (!page) notFound();
  return (
    <article className="max-w-4xl rounded-[2.1rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
      <div className="rounded-[1.6rem] bg-ink-900/92 p-6 sm:p-10 lg:p-12">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[0.96] tracking-[-0.055em] text-balance sm:text-6xl">{page.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-paper-200">{page.intro}</p>
        <div className="mt-12 space-y-11">
          {page.sections.map((section) => <section key={section.heading} className="scroll-mt-28"><h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{section.heading}</h2><p className="mt-4 leading-7 text-paper-200">{section.body}</p>{section.code ? <CodeBlock code={section.code} language={section.language} /> : null}</section>)}
        </div>
      </div>
    </article>
  );
}
