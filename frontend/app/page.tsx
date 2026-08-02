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

const heroFlow = [
  ["01", "Challenge", "single use"],
  ["02", "Scope", "per origin"],
  ["03", "Verdict", "minimized"],
] as const;

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-paper-50">
      <main>
        <section className="aperture-field relative isolate flex min-h-[calc(100dvh-5rem)] items-center overflow-hidden px-5 pb-14 pt-12 sm:pt-14 lg:px-8 lg:pb-12 lg:pt-10">
          <div aria-hidden="true" className="hero-aperture-motion" />
          <div aria-hidden="true" className="hero-scanline" />
          <div aria-hidden="true" className="aperture-ring absolute -right-44 -top-32 size-136 rounded-full opacity-50 blur-[0.2px]" />
          <div aria-hidden="true" className="absolute bottom-24 left-[5%] h-px w-2xl -rotate-6 bg-linear-to-r from-transparent via-signal-400/40 to-transparent" />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 lg:-translate-y-2 lg:grid-cols-[0.86fr_1.14fr] lg:items-center xl:-translate-y-4">
            <Reveal className="max-w-3xl">
              <h1 className="mt-7 max-w-4xl text-[clamp(3.35rem,5.8vw,5.95rem)] font-semibold leading-[0.88] tracking-[-0.07em] text-balance">
                Prove access. Keep wallets private.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-paper-200">
                Hosts get a scoped ID and verdict, not the Stellar address.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="group rounded-full pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
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
                  className="rounded-full border-paper-50/16 bg-paper-50/5 text-paper-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-paper-50/10"
                >
                  <Link href="/docs">Read developer docs</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay="medium" className="relative mx-auto w-full max-w-172 lg:max-w-none">
              <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-signal-400/10 blur-3xl" />
              <div aria-hidden="true" className="absolute -right-10 top-12 hidden h-52 w-52 rounded-full border border-signal-400/20 lg:block" />
              <div aria-hidden="true" className="absolute -right-1 top-28 hidden h-32 w-32 rounded-full border border-signal-400/30 lg:block" />

              <div className="relative rounded-[2.55rem] border border-paper-50/12 bg-paper-50/4.5 p-2 shadow-[0_44px_130px_rgba(0,0,0,0.48)]">
                <div className="absolute -top-4 left-8 hidden rounded-full border border-signal-400/25 bg-ink-950 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-signal-400 shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:block">
                  Private aperture live
                </div>

                <div className="rounded-[2.05rem] border border-line-dark/80 bg-ink-950/96 p-2">
                  <div className="grid gap-2 xl:grid-cols-[1fr_10rem]">
                    <div className="rounded-[1.55rem] border border-paper-50/8 bg-paper-50/2.5 p-1.5">
                      <ProofWindow />
                    </div>

                    <aside className="hidden rounded-[1.55rem] border border-paper-50/10 bg-ink-900/82 p-4 xl:block">
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-paper-200">
                        Gate path
                      </p>
                      <div className="mt-5 space-y-3">
                        {heroFlow.map(([step, label, value]) => (
                          <div key={label} className="rounded-2xl border border-paper-50/10 bg-paper-50/[0.035] p-3">
                            <span className="font-mono text-[0.64rem] text-signal-400">
                              {step}
                            </span>
                            <p className="mt-3 text-sm font-semibold tracking-[-0.02em] text-paper-50">
                              {label}
                            </p>
                            <p className="mt-1 text-xs text-paper-200">{value}</p>
                          </div>
                        ))}
                      </div>
                    </aside>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {[
                      ["App A", "vp_appA_72f1"],
                      ["App B", "vp_appB_19c8"],
                      ["Wallet", "withheld"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[1.2rem] border border-paper-50/10 bg-paper-50/[0.035] px-4 py-3">
                        <p className="text-xs text-paper-200">{label}</p>
                        <p className="mt-1 truncate font-mono text-[0.72rem] text-paper-50">
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

        <PayloadComparison />

        <section className="section-ink-wash relative overflow-hidden px-5 py-24 lg:px-8 lg:py-36">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-signal-400/50 to-transparent" />
          <div className="mx-auto max-w-7xl">
            <Reveal className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <div>
                <p className="eyebrow">Reviewer path</p>
                <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tighter text-balance sm:text-6xl">
                  Inspect the boundary from three angles.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-paper-200 lg:justify-self-end">
                Run App A, switch to App B, then test replay and revocation. The product shows the exact point where the wallet stops.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {inspectionCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <Reveal key={card.title} as="article" delay={index === 0 ? "none" : index === 1 ? "short" : "medium"} className="group rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-signal-400/35">
                    <div className="h-full rounded-[1.45rem] bg-ink-900/92 p-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1">
                      <div className="grid size-11 place-items-center rounded-2xl bg-signal-400/10 text-signal-400">
                        <Icon aria-hidden="true" size={23} weight="duotone" />
                      </div>
                      <h3 className="mt-14 text-2xl font-semibold tracking-[-0.04em]">{card.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-paper-200">{card.text}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <PrivacyBoundary />

        <section className="section-ink-slab px-5 py-24 lg:px-8 lg:py-36">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <Reveal className="rounded-[2.1rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
              <div className="flex h-full flex-col justify-between rounded-[1.6rem] bg-ink-900/92 p-7 sm:p-9">
                <div>
                  <p className="eyebrow">Evidence package</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
                    Built to be checked, not believed.
                  </h2>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-paper-200">
                    The repo keeps the contract ID, test matrix, screenshots, and proof limitation notes close to the product code.
                  </p>
                </div>
                <Button asChild size="lg" className="mt-10 w-fit rounded-full pr-1.5">
                  <Link href="/docs">
                    Open docs
                    <span aria-hidden="true" className="ml-2 grid size-8 place-items-center rounded-full bg-ink-950/12">
                      <ArrowRightIcon size={16} />
                    </span>
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay="short" className="grid gap-4">
              {evidence.map(([label, text]) => (
                <article key={label} className="rounded-[1.65rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
                  <div className="flex items-start gap-5 rounded-[1.2rem] bg-ink-950/80 p-5 sm:p-6">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-signal-400/10 text-signal-400">
                      {label === "Contract" ? <CodeIcon size={22} /> : label === "Tests" ? <ShieldCheckIcon size={22} /> : <WalletIcon size={22} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.03em]">{label}</h3>
                      <p className="mt-2 text-sm leading-7 text-paper-200">{text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="section-paper-slit border-y border-line-dark px-5 py-24 lg:px-8 lg:py-32">
          <Reveal className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Host response</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
                A small payload with hard edges.
              </h2>
              <p className="mt-6 max-w-xl text-paper-200">
                The verifier returns fields that support access control. It does not return the wallet address.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-[1.65rem] border border-paper-50/10 bg-ink-900 p-6 font-mono text-sm leading-7 text-paper-200 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
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

        <section className="section-ink-wash px-5 py-24 lg:px-8 lg:py-36">
          <Reveal className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
                Questions reviewers ask first
              </h2>
              <p className="mt-6 max-w-xl text-paper-200">
                Short answers for the privacy, deployment, and proof claims that need clean edges.
              </p>
            </div>
            <LandingFaq />
          </Reveal>
        </section>

        <section className="bg-[linear-gradient(180deg,#0f1412_0%,#0b0f0e_100%)] px-5 pb-24 lg:px-8 lg:pb-36">
          <Reveal className="mx-auto max-w-7xl rounded-[2.35rem] border border-signal-400/22 bg-signal-400/8 p-2">
            <div className="rounded-[1.85rem] bg-ink-950 px-6 py-12 text-center sm:px-10 lg:py-16">
              <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl">
                One wallet. Two apps. Two private host IDs.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-paper-200">
                Open the controlled bench, replay a spent challenge, then revoke the gate and watch verification fail.
              </p>
              <Button asChild size="lg" className="mt-9 rounded-full pr-1.5">
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
      <footer className="border-t border-line-dark px-5 py-8 text-sm text-paper-200 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row">
          <span>VeilPass MVP. Stellar testnet only.</span>
          <div className="flex flex-wrap gap-5">
            <Link className="smooth-link" href="/docs/security">Security</Link>
            <Link className="smooth-link" href="/docs/privacy-model">Privacy model</Link>
            <Link className="smooth-link" href="/docs/limitations">Limitations</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
