import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { FingerprintSimpleIcon } from "@phosphor-icons/react/dist/ssr/FingerprintSimple";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { PayloadComparison } from "@/components/marketing/payload-comparison";
import { PrivacyBoundary } from "@/components/marketing/privacy-boundary";
import { ProofWindow } from "@/components/marketing/proof-window";
import { Button } from "@/components/ui/button";
import { absoluteUrl, landingFaqItems, siteConfig } from "@/lib/seo";

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/icon.svg"),
    description:
      "VeilPass builds privacy-preserving wallet eligibility login for Stellar dApps.",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    image: absoluteUrl("/opengraph-image"),
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/pricing.md"),
    },
    featureList: [
      "Origin-scoped private app IDs",
      "Stellar Testnet gate registry",
      "Freighter enrollment flow",
      "One-time challenge verification",
      "Host responses without Stellar wallet addresses",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landingFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
] as const;

const inspectionCards = [
  {
    icon: FingerprintSimpleIcon,
    title: "Different app, different ID",
    text: "The same wallet becomes a separate host identifier for each allowed origin.",
  },
  {
    icon: LockKeyIcon,
    title: "Challenge gets consumed",
    text: "Replay attempts hit the spent-challenge path instead of creating another session.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Verifier stays small",
    text: "The host receives the verdict fields it needs and nothing that identifies the wallet.",
  },
] as const;

const evidence = [
  ["Contract", "Soroban gate deployed on Stellar Testnet"],
  ["Tests", "Unit, e2e, a11y, build, and contract smoke are wired"],
  ["Docs", "Privacy model and limitations stay visible"],
] as const;

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-paper-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="aperture-field relative isolate flex min-h-[calc(100dvh-5rem)] items-center overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8 lg:pb-12 lg:pt-10">
          <div aria-hidden="true" className="hero-aperture-motion" />
          <div aria-hidden="true" className="hero-scanline" />
          {/* Ring — smaller on mobile so it doesn't cause overflow */}
          <div aria-hidden="true" className="aperture-ring absolute -right-24 -top-24 size-64 rounded-full opacity-40 blur-[0.2px] sm:-right-36 sm:-top-28 sm:size-96 lg:-right-44 lg:-top-32 lg:size-136 lg:opacity-50" />
          {/* Ornamental gradient line — hidden on mobile to prevent overflow */}
          <div aria-hidden="true" className="absolute bottom-24 left-[5%] hidden h-px w-2xl -rotate-6 bg-linear-to-r from-transparent via-signal-400/40 to-transparent sm:block" />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 sm:gap-12 lg:-translate-y-2 lg:grid-cols-[0.86fr_1.14fr] lg:items-center xl:-translate-y-4">
            <Reveal className="max-w-3xl">
              {/* H1 — clamp rebalanced so minimum is smaller on narrow viewports */}
              <h1 className="mt-6 max-w-4xl text-[clamp(2.6rem,7vw,5.95rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-balance sm:mt-7 sm:text-[clamp(3rem,6vw,5.95rem)] sm:leading-[0.88] sm:tracking-[-0.07em]">
                Prove access. Keep wallets private.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-paper-200 sm:mt-6 sm:text-lg sm:leading-8">
                Hosts get a scoped ID and verdict, not the Stellar address.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 sm:mt-9">
                <Button
                  asChild
                  size="lg"
                  className="group w-full rounded-full pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:w-auto"
                >
                  <Link href="/demo">
                    Try demo
                    <span aria-hidden="true" className="ml-2 grid size-8 place-items-center rounded-full bg-ink-950/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                      <ArrowRightIcon size={16} />
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-paper-50/16 bg-paper-50/5 text-paper-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-paper-50/10 sm:w-auto"
                >
                  <Link href="/docs">Read developer docs</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay="medium" className="relative mx-auto w-full max-w-lg sm:max-w-xl lg:max-w-none">
              <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-signal-400/10 blur-3xl" />
              <div aria-hidden="true" className="absolute -right-10 top-12 hidden h-52 w-52 rounded-full border border-signal-400/20 lg:block" />
              <div aria-hidden="true" className="absolute -right-1 top-28 hidden h-32 w-32 rounded-full border border-signal-400/30 lg:block" />

              <div className="relative rounded-[1.75rem] border border-paper-50/12 bg-paper-50/4.5 p-2 shadow-[0_44px_130px_rgba(0,0,0,0.48)] sm:rounded-[2.55rem]">
                <div className="absolute -top-4 left-6 hidden rounded-full border border-signal-400/25 bg-ink-950 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-signal-400 shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:left-8 sm:block sm:px-4 sm:py-2 sm:text-[0.68rem]">
                  Private aperture live
                </div>

                <div className="rounded-[1.3rem] border border-line-dark/80 bg-ink-950/96 p-2 sm:rounded-[2.05rem]">
                  <div className="rounded-[0.9rem] border border-paper-50/8 bg-paper-50/2.5 p-1.5 sm:rounded-[1.55rem]">
                    <ProofWindow />
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
                    {[
                      ["Challenge", "single use"],
                      ["Origin", "scoped"],
                      ["Wallet", "withheld"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[0.9rem] border border-paper-50/10 bg-paper-50/[0.035] px-2 py-2.5 sm:rounded-[1.2rem] sm:px-4 sm:py-3">
                        <p className="text-[0.6rem] text-paper-200 sm:text-xs">{label}</p>
                        <p className="mt-1 truncate font-mono text-[0.6rem] text-paper-50 sm:text-[0.72rem]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Payload Comparison ──────────────────────────────────────── */}
        <PayloadComparison />

        {/* ── Inspection Cards ────────────────────────────────────────── */}
        <section className="section-ink-wash relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-36">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-signal-400/50 to-transparent" />
          <div className="mx-auto max-w-7xl">
            <Reveal className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <div>
                <p className="eyebrow">Reviewer path</p>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tighter text-balance sm:text-4xl lg:text-6xl">
                  Inspect the boundary from three angles.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-paper-200 sm:text-lg sm:leading-8 lg:justify-self-end">
                Run App A, switch to App B, then test replay and revocation. The product shows the exact point where the wallet stops.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:mt-14 lg:grid-cols-3">
              {inspectionCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <Reveal key={card.title} as="article" delay={index === 0 ? "none" : index === 1 ? "short" : "medium"} className="group rounded-[1.65rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-signal-400/35 sm:rounded-[1.9rem]">
                    <div className="h-full rounded-[1.2rem] bg-ink-900/92 p-5 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1 sm:rounded-[1.45rem] sm:p-6">
                      <div className="grid size-11 place-items-center rounded-2xl bg-signal-400/10 text-signal-400">
                        <Icon aria-hidden="true" size={23} weight="duotone" />
                      </div>
                      <h3 className="mt-10 text-xl font-semibold tracking-[-0.04em] sm:mt-14 sm:text-2xl">{card.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-paper-200 sm:mt-4">{card.text}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Privacy Boundary ────────────────────────────────────────── */}
        <PrivacyBoundary />

        {/* ── Evidence Package ────────────────────────────────────────── */}
        <section className="section-ink-slab px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-36">
          <div className="mx-auto grid max-w-7xl gap-6 sm:gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <Reveal className="rounded-[1.75rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 sm:rounded-[2.1rem]">
              <div className="flex h-full flex-col justify-between rounded-[1.3rem] bg-ink-900/92 p-6 sm:rounded-[1.6rem] sm:p-9">
                <div>
                  <p className="eyebrow">Evidence package</p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tighter text-balance sm:text-4xl lg:text-5xl">
                    Built to be checked, not believed.
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-paper-200 sm:mt-6 sm:text-lg sm:leading-8">
                    The repo keeps the contract ID, test matrix, screenshots, and proof limitation notes close to the product code.
                  </p>
                </div>
                <Button asChild size="lg" className="mt-8 w-full rounded-full pr-1.5 sm:mt-10 sm:w-fit">
                  <Link href="/docs">
                    Open docs
                    <span aria-hidden="true" className="ml-2 grid size-8 place-items-center rounded-full bg-ink-950/12">
                      <ArrowRightIcon size={16} />
                    </span>
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay="short" className="grid gap-3 sm:gap-4">
              {evidence.map(([label, text]) => (
                <article key={label} className="rounded-[1.5rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 sm:rounded-[1.65rem]">
                  <div className="flex items-start gap-4 rounded-[1.1rem] bg-ink-950/80 p-4 sm:gap-5 sm:rounded-[1.2rem] sm:p-5 lg:p-6">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-signal-400/10 text-signal-400 sm:size-11 sm:rounded-2xl">
                      {label === "Contract" ? <CodeIcon size={22} /> : label === "Tests" ? <ShieldCheckIcon size={22} /> : <WalletIcon size={22} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] sm:text-xl">{label}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-paper-200 sm:mt-2 sm:leading-7">{text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ── Host Response / JSON ────────────────────────────────────── */}
        <section className="section-paper-slit border-y border-line-dark px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <Reveal className="mx-auto grid max-w-7xl gap-8 sm:gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Host response</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tighter text-balance sm:text-4xl lg:text-5xl">
                A small payload with hard edges.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-paper-200 sm:mt-6 sm:text-base">
                The verifier returns fields that support access control. It does not return the wallet address.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-[1.35rem] border border-paper-50/10 bg-ink-900 p-4 font-mono text-xs leading-6 text-paper-200 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:rounded-[1.65rem] sm:p-6 sm:text-sm sm:leading-7 lg:p-8">
              <code>{`{
  "ok": true,
  "privateAppId": "vp_appA_72f1",
  "gateId": "premium-holder",
  "epoch": 1,
  "origin": "https://app.example",
  "expiresAt": 1760000000000
}`}</code>
            </pre>
          </Reveal>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="section-ink-wash px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-7xl">
            <Reveal className="grid gap-10 sm:gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="eyebrow">FAQ</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tighter text-balance sm:text-4xl lg:text-5xl">
                  Questions reviewers ask first
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-paper-200 sm:mt-6 sm:text-base">
                  Short answers for the privacy, deployment, and proof claims that need clean edges.
                </p>
              </div>
              <LandingFaq />
            </Reveal>
          </div>
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────────── */}
        <section className="bg-[linear-gradient(180deg,#0f1412_0%,#0b0f0e_100%)] px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8 lg:pb-36">
          <Reveal className="mx-auto max-w-7xl rounded-[1.5rem] border border-signal-400/22 bg-signal-400/8 p-1.5 sm:rounded-[2.35rem] sm:p-2">
            <div className="rounded-[1.1rem] bg-ink-950 px-5 py-10 text-center sm:rounded-[1.85rem] sm:px-10 sm:py-12 lg:py-16">
              <h2 className="mx-auto max-w-4xl text-3xl font-semibold tracking-[-0.055em] text-balance sm:text-4xl lg:text-6xl">
                One wallet. Two apps. Two private host IDs.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-paper-200 sm:mt-6 sm:text-lg sm:leading-8">
                Open the controlled bench, replay a spent challenge, then revoke the gate and watch verification fail.
              </p>
              <Button asChild size="lg" className="mt-7 w-full rounded-full pr-1.5 sm:mt-9 sm:w-auto">
                <Link href="/demo">
                  Open the demo
                  <span aria-hidden="true" className="ml-2 grid size-8 place-items-center rounded-full bg-ink-950/12">
                    <ArrowRightIcon size={16} />
                  </span>
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-line-dark px-4 py-7 text-sm text-paper-200 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <span>VeilPass MVP. Stellar testnet only.</span>
          <div className="flex flex-wrap gap-4 sm:gap-5">
            <Link className="smooth-link" href="/docs/security">Security</Link>
            <Link className="smooth-link" href="/docs/privacy-model">Privacy model</Link>
            <Link className="smooth-link" href="/docs/limitations">Limitations</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
