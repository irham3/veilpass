import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import Link from "next/link";

import { PayloadComparison } from "@/components/marketing/payload-comparison";
import { PrivacyBoundary } from "@/components/marketing/privacy-boundary";
import { ProofWindow } from "@/components/marketing/proof-window";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-ink-950 text-paper-50">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-5 py-16 lg:min-h-[calc(100svh-4rem)] lg:px-8 lg:py-20">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(165,255,206,0.12),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[5fr_7fr] lg:items-center">
            <div className="max-w-xl">
              <Badge variant="outline" className="border-signal-400/40 bg-signal-400/10 text-signal-400">Stellar testnet MVP</Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl xl:text-7xl">Prove access.<br /><span className="text-paper-200">Keep your wallet private.</span></h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-paper-200">VeilPass lets a Stellar wallet prove it meets an access rule without giving the host dApp its public address.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href="/demo">Try the two-origin demo <ArrowRightIcon /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="/docs">Read developer docs</Link></Button>
              </div>
              <p className="mt-6 font-mono text-xs text-paper-200">No wallet address in the host response.</p>
            </div>
            <ProofWindow />
          </div>
        </section>
        <PayloadComparison />
        <PrivacyBoundary />
        <section className="border-y border-line-dark px-5 py-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div><p className="eyebrow">Built for inspection</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">A small response surface with hard edges.</h2></div>
            <pre className="overflow-x-auto rounded-2xl border border-line-dark bg-ink-900 p-6 font-mono text-sm leading-7 text-paper-200 sm:p-8"><code>{`{
  "ok": true,
  "privateAppId": "vp_appA_72f1",
  "gateId": "premium-holder",
  "epoch": 20391,
  "origin": "https://app.example",
  "expiresAt": 1760000000000
}`}</code></pre>
          </div>
        </section>
        <section className="px-5 py-24 text-center lg:px-8 lg:py-32"><div className="mx-auto max-w-3xl"><p className="eyebrow">See the boundary move</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">One wallet. Two apps. Two unlinkable host identifiers.</h2><p className="mx-auto mt-6 max-w-2xl text-paper-200">Run the controlled test bench, replay a spent challenge, then revoke the gate and watch verification fail.</p><Button asChild size="lg" className="mt-9"><Link href="/demo">Open the demo <ArrowRightIcon /></Link></Button></div></section>
      </main>
      <footer className="border-t border-line-dark px-5 py-8 text-sm text-paper-200 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row"><span>VeilPass MVP. Stellar testnet only.</span><div className="flex gap-5"><Link href="/docs/security">Security</Link><Link href="/docs/privacy-model">Privacy model</Link><Link href="/docs/limitations">Limitations</Link></div></div></footer>
    </div>
  );
}
