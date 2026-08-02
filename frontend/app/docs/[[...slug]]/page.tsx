import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeBlock } from "@/components/docs/code-block";
import { Reveal } from "@/components/motion/reveal";
import { docNav, docs } from "@/lib/docs/content";

export function generateStaticParams() { return docNav.map(([slug]) => ({ slug: slug ? [slug] : [] })); }

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const key = slug[0] ?? "";
  const page = docs[key];
  if (!page) notFound();
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-paper-50">
      <div className="aperture-field relative px-5 py-10 sm:py-12 lg:px-8 lg:py-20">
        <div aria-hidden="true" className="aperture-ring absolute right-[-14rem] top-6 size-[32rem] rounded-full opacity-25" />
        <div className="relative mx-auto grid max-w-7xl gap-5 lg:grid-cols-[16rem_1fr] lg:gap-6">
        <Reveal as="aside" className="rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-[1.4rem] bg-ink-950/82 p-5">
          <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-paper-200">Documentation</p>
          <nav aria-label="Documentation" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {docNav.map(([slugValue, label]) => <Link key={slugValue} href={`/docs${slugValue ? `/${slugValue}` : ""}`} aria-current={key === slugValue ? "page" : undefined} className="rounded-2xl px-3 py-2 text-sm text-paper-200 transition-colors hover:bg-paper-50/10 hover:text-paper-50 aria-[current=page]:bg-signal-400/12 aria-[current=page]:text-paper-50">{label}</Link>)}
          </nav>
          </div>
        </Reveal>
        <main className="min-w-0">
          <Reveal as="article" className="max-w-4xl rounded-[2.1rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
            <div className="rounded-[1.6rem] bg-ink-900/92 p-6 sm:p-10 lg:p-12">
              <p className="eyebrow">{page.eyebrow}</p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-balance sm:text-7xl">{page.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-paper-200">{page.intro}</p>
              <div className="mt-14 space-y-12">
                {page.sections.map((section) => <section key={section.heading}><h2 className="text-3xl font-semibold tracking-[-0.045em]">{section.heading}</h2><p className="mt-4 leading-7 text-paper-200">{section.body}</p>{section.code ? <CodeBlock code={section.code} language={section.language} /> : null}</section>)}
              </div>
            </div>
          </Reveal>
        </main>
        </div>
      </div>
    </div>
  );
}
