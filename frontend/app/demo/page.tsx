import Link from "next/link";

import { DemoBench } from "@/components/demo/demo-bench";
import { SiteHeader } from "@/components/site-header";

export default function DemoPage() {
  return <div className="min-h-screen bg-ink-950 text-paper-50"><SiteHeader /><main className="px-5 py-14 lg:px-8 lg:py-20"><div className="mx-auto max-w-[90rem]"><div className="mb-10 max-w-3xl"><p className="eyebrow">Controlled test bench</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">Watch one credential separate across two origins.</h1><p className="mt-6 text-lg leading-8 text-paper-200">This local fixture demonstrates response minimization, stable same-origin identity, cross-origin separation, replay rejection, and revocation. It is not a real zero-knowledge proof.</p></div><DemoBench /><div className="mt-8 rounded-xl border border-line-dark bg-ink-900 p-5 text-sm leading-6 text-paper-200"><strong className="text-paper-50">Want the live path?</strong> Connect Freighter on the <Link href="/dashboard/enroll" className="text-signal-400 underline underline-offset-4">enrollment screen</Link>. Live contract actions remain disabled until testnet environment values are configured.</div></div></main></div>;
}
