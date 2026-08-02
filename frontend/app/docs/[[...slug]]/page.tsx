import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeBlock } from "@/components/docs/code-block";
import { SiteHeader } from "@/components/site-header";
import { docNav, docs } from "@/lib/docs/content";

export function generateStaticParams() { return docNav.map(([slug]) => ({ slug: slug ? [slug] : [] })); }

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const key = slug[0] ?? "";
  const page = docs[key];
  if (!page) notFound();
  return (
    <div className="paper-theme min-h-screen bg-background text-foreground">
      <div className="[&>header]:border-ink-950/10 [&>header]:bg-ink-950"><SiteHeader /></div>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-border p-5 lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)] lg:border-r lg:border-b-0 lg:p-7">
          <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">Documentation</p>
          <nav aria-label="Documentation" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {docNav.map(([slugValue, label]) => <Link key={slugValue} href={`/docs${slugValue ? `/${slugValue}` : ""}`} aria-current={key === slugValue ? "page" : undefined} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-ink-950 aria-[current=page]:text-paper-50">{label}</Link>)}
          </nav>
        </aside>
        <main className="min-w-0 px-5 py-14 sm:px-10 lg:px-16 lg:py-20">
          <article className="max-w-3xl"><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{page.eyebrow}</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{page.title}</h1><p className="mt-6 text-lg leading-8 text-muted-foreground">{page.intro}</p><div className="mt-14 space-y-12">{page.sections.map((section) => <section key={section.heading}><h2 className="text-2xl font-semibold tracking-[-0.025em]">{section.heading}</h2><p className="mt-4 leading-7 text-muted-foreground">{section.body}</p>{section.code ? <CodeBlock code={section.code} language={section.language} /> : null}</section>)}</div></article>
        </main>
      </div>
    </div>
  );
}
