import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ContractActions } from "@/components/dashboard/contract-actions";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { readGateState } from "@/packages/shared/src/contract";

export const metadata: Metadata = {
  title: "Operator dashboard",
  description:
    "Read VeilPass public gate state and operator status from Stellar Testnet.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  await connection();

  const contractId = process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID ?? "";
  const sourceAccount = process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT ?? "";
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const configured = Boolean(contractId && sourceAccount);
  let state: { owner: string; policyHash: string; root: string; epoch: number; updatedAt: string } | null = null;
  let freshness = configured ? "RPC read unavailable" : "Waiting for contract configuration";
  if (configured) {
    try { const live = await readGateState({ contractId, sourceAccount, rpcUrl, gateId: "premium-holder" }); state = { owner: live.owner, policyHash: Buffer.from(live.policy_hash).toString("hex"), root: Buffer.from(live.credential_root).toString("hex"), epoch: live.epoch, updatedAt: new Date(Number(live.updated_at) * 1000).toISOString() }; freshness = "Read live from Stellar RPC"; } catch { freshness = "Contract configured, but gate state could not be read"; }
  }
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-paper-50">
      <main className="aperture-field relative px-5 py-14 lg:px-8 lg:py-20">
        <div aria-hidden="true" className="aperture-ring absolute left-[-15rem] top-8 size-[30rem] rounded-full opacity-25" />
        <div className="relative mx-auto grid max-w-[90rem] gap-5 lg:grid-cols-[16rem_1fr]">
          <Reveal as="aside" className="rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-[1.4rem] bg-ink-950/82 p-5">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-paper-200">Operator workspace</p>
              <nav className="mt-7 space-y-2" aria-label="Dashboard">
                <Link href="/dashboard" aria-current="page" className="block rounded-2xl bg-signal-400/12 px-3 py-2 text-sm text-paper-50">Gate registry</Link>
                <Link href="/dashboard/enroll" className="block rounded-2xl px-3 py-2 text-sm text-paper-200 transition-colors hover:bg-paper-50/10 hover:text-paper-50">Enrollment</Link>
                <Link href="/docs/contract" className="block rounded-2xl px-3 py-2 text-sm text-paper-200 transition-colors hover:bg-paper-50/10 hover:text-paper-50">Contract docs</Link>
              </nav>
            </div>
          </Reveal>

          <div className="min-w-0">
            <Reveal className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="eyebrow">Gate registry</p>
                <h1 className="mt-3 text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-balance sm:text-7xl">premium-holder</h1>
                <p className="mt-5 max-w-2xl text-paper-200">Read the public gate root, epoch, and operator status from Stellar Testnet.</p>
              </div>
              <Badge variant={configured ? "secondary" : "outline"} className="rounded-full">{configured ? "Testnet configured" : "Setup required"}</Badge>
            </Reveal>

            <div className="mt-10 grid gap-5 xl:grid-cols-[1fr_1.15fr]">
              <Reveal as="section" delay="short" className="rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
                <div className="h-full rounded-[1.4rem] bg-ink-900/92 p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">Public gate state</h2>
                  <dl className="mt-6 space-y-5 text-sm">
                    <Data label="Contract ID" value={contractId || "Not configured"} />
                    <Data label="Network" value="Stellar Testnet" />
                    <Data label="Policy hash" value={state?.policyHash ?? "Unavailable until deployment"} />
                    <Data label="Credential root" value={state?.root ?? "Unavailable until deployment"} />
                    <Data label="Epoch" value={String(state?.epoch ?? 1)} />
                    <Data label="Updated at" value={state?.updatedAt ?? "No live read"} />
                    <Data label="Verifier freshness" value={freshness} />
                  </dl>
                </div>
              </Reveal>
              <Reveal delay="medium">
                <ContractActions contractId={contractId} rpcUrl={rpcUrl} configured={configured} />
              </Reveal>
            </div>

            <Reveal delay="short" as="section" className="mt-5 rounded-[1.65rem] border border-signal-400/24 bg-signal-400/[0.07] p-5 text-sm leading-7 text-paper-200">
              Routine login stays off-chain. This workspace uses Freighter only for administrative contract writes. No secret key is requested or stored.
            </Reveal>
          </div>
        </div>
      </main>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-paper-200">{label}</dt>
      <dd className="mt-1 max-w-full font-mono text-xs leading-6 text-paper-50 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
