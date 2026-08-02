import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BrowserIcon } from "@phosphor-icons/react/dist/ssr/Browser";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";

import { Reveal } from "@/components/motion/reveal";

const boundaries = [
  { icon: WalletIcon, title: "Issuer", text: "Sees the Stellar address during enrollment and signs the credential." },
  { icon: ShieldCheckIcon, title: "VeilPass login", text: "Checks eligibility and derives a private ID scoped to one origin." },
  { icon: BrowserIcon, title: "Host dApp", text: "Receives a verdict and scoped ID, never the wallet address." },
] as const;

export function PrivacyBoundary() {
  return (
    <section aria-labelledby="boundary-title" className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-36">
      <div aria-hidden="true" className="absolute left-1/2 top-24 h-px w-[80rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-signal-400/35 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="eyebrow">The exact boundary</p>
          <h2 id="boundary-title" className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.055em] text-balance sm:text-4xl lg:text-6xl">
            Private to the host, honest about the rest.
          </h2>
        </Reveal>

        {/*
          Mobile:   1 column (stacked)
          Tablet:   3 columns side-by-side (no arrows between)
          Desktop:  [card] [arrow] [card] [arrow] [card]
        */}
        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {boundaries.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="contents">
                <Reveal as="article" delay={index === 0 ? "none" : index === 1 ? "short" : "medium"} className="group rounded-[1.65rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 sm:rounded-[1.9rem]">
                  <div className="h-full rounded-[1.2rem] bg-ink-900/92 p-5 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1 sm:rounded-[1.45rem] sm:p-6">
                    <Icon size={24} className="text-signal-400 sm:size-7" weight="duotone" />
                    <h3 className="mt-10 text-xl font-semibold tracking-[-0.04em] sm:mt-16 sm:text-2xl">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-paper-200">{item.text}</p>
                  </div>
                </Reveal>
                {/* Arrow only visible at lg+ breakpoint, not between cards on sm/md */}
                {index < boundaries.length - 1 ? (
                  <ArrowRightIcon aria-hidden="true" className="hidden self-center text-signal-400/70 lg:block" size={22} />
                ) : null}
              </div>
            );
          })}
        </div>

        <Reveal delay="short" className="mt-6 max-w-full rounded-2xl border border-signal-400/25 bg-signal-400/[0.06] p-4 text-sm leading-7 text-paper-200 sm:mt-8 sm:max-w-3xl sm:rounded-3xl sm:p-5">
          VeilPass does not provide network anonymity. IP address, browser fingerprint, timing, and later on-chain actions may still identify or correlate a user.
        </Reveal>
      </div>
    </section>
  );
}
