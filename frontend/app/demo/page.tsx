import Link from "next/link";

import { DemoBench } from "@/components/demo/demo-bench";
import { Reveal } from "@/components/motion/reveal";
import { SiteHeader } from "@/components/site-header";

export default function DemoPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-paper-50">
      <SiteHeader />
      <main className="aperture-field relative overflow-hidden px-5 py-14 lg:px-8 lg:py-20">
        <div aria-hidden="true" className="aperture-ring absolute right-[-13rem] top-[-9rem] size-[32rem] rounded-full opacity-35" />
        <div className="relative mx-auto max-w-[90rem]">
          <Reveal className="mb-10 grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-end">
            <div>
              <p className="eyebrow">Controlled test bench</p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-balance sm:text-7xl">
                Watch one credential split clean.
              </h1>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-paper-200 lg:justify-self-end">
              App A and App B receive different private IDs. Replay and revocation fail in the open.
            </p>
          </Reveal>

          <Reveal delay="short" className="rounded-[2.35rem] border border-paper-50/10 bg-paper-50/[0.035] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.34)]">
            <DemoBench />
          </Reveal>

          <Reveal delay="medium" className="mt-8 rounded-[1.65rem] border border-signal-400/24 bg-signal-400/[0.07] p-5 text-sm leading-7 text-paper-200">
            <strong className="text-paper-50">Live path:</strong>{" "}
            connect Freighter on the{" "}
            <Link href="/dashboard/enroll" className="text-signal-400 underline underline-offset-4">
              enrollment screen
            </Link>
            . Contract reads use the deployed Stellar Testnet gate.
          </Reveal>
        </div>
      </main>
    </div>
  );
}
