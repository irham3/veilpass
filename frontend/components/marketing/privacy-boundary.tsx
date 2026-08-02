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
    <section aria-labelledby="boundary-title" className="relative overflow-hidden px-5 py-24 lg:px-8 lg:py-36">
      <div aria-hidden="true" className="absolute left-1/2 top-24 h-px w-[80rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-signal-400/35 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="eyebrow">The exact boundary</p>
          <h2 id="boundary-title" className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl">
            Private to the host, honest about the rest.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {boundaries.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="contents">
                <Reveal as="article" delay={index === 0 ? "none" : index === 1 ? "short" : "medium"} className="group rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
                  <div className="h-full rounded-[1.45rem] bg-ink-900/92 p-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1">
                    <Icon size={28} className="text-signal-400" weight="duotone" />
                    <h3 className="mt-16 text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-paper-200">{item.text}</p>
                  </div>
                </Reveal>
                {index < boundaries.length - 1 ? (
                  <ArrowRightIcon aria-hidden="true" className="hidden self-center text-signal-400/70 lg:block" size={22} />
                ) : null}
              </div>
            );
          })}
        </div>
        <Reveal delay="short" className="mt-8 max-w-3xl rounded-3xl border border-signal-400/25 bg-signal-400/[0.06] p-5 text-sm leading-7 text-paper-200">
          VeilPass does not provide network anonymity. IP address, browser fingerprint, timing, and later on-chain actions may still identify or correlate a user.
        </Reveal>
      </div>
    </section>
  );
}
