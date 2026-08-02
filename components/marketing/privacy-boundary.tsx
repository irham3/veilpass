import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BrowserIcon } from "@phosphor-icons/react/dist/ssr/Browser";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";

const boundaries = [
  { icon: WalletIcon, title: "Issuer", text: "Sees the Stellar address during enrollment and signs the credential." },
  { icon: ShieldCheckIcon, title: "VeilPass login", text: "Checks eligibility and derives a private ID scoped to one origin." },
  { icon: BrowserIcon, title: "Host dApp", text: "Receives a verdict and scoped ID, never the wallet address." },
] as const;

export function PrivacyBoundary() {
  return (
    <section aria-labelledby="boundary-title" className="px-5 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <p className="eyebrow">The exact boundary</p><h2 id="boundary-title" className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Private to the host, honest about the rest.</h2>
        <div className="mt-14 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {boundaries.map((item, index) => { const Icon = item.icon; return <div key={item.title} className="contents"><article className="rounded-2xl border border-line-dark bg-ink-900 p-6"><Icon size={26} className="text-signal-400" weight="duotone" /><h3 className="mt-12 text-xl font-medium">{item.title}</h3><p className="mt-3 text-sm leading-6 text-paper-200">{item.text}</p></article>{index < boundaries.length - 1 ? <ArrowRightIcon aria-hidden="true" className="hidden self-center text-paper-200 lg:block" size={22} /> : null}</div>; })}
        </div>
        <p className="mt-8 max-w-3xl border-l border-signal-400 pl-5 text-sm leading-6 text-paper-200">VeilPass does not provide network anonymity. IP address, browser fingerprint, timing, and later on-chain actions may still identify or correlate a user.</p>
      </div>
    </section>
  );
}
