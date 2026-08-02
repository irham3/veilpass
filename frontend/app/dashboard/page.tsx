import Link from "next/link";
import { connection } from "next/server";

import { ContractActions } from "@/components/dashboard/contract-actions";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { readGateState } from "@/packages/shared/src/contract";

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
  return <div className="paper-theme min-h-screen bg-background text-foreground"><div className="[&>header]:bg-ink-950"><SiteHeader /></div><div className="mx-auto grid max-w-[90rem] lg:grid-cols-[15rem_1fr]"><aside className="border-b border-border bg-ink-950 p-6 text-paper-50 lg:min-h-[calc(100svh-4rem)] lg:border-r lg:border-b-0"><p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-paper-200">Operator workspace</p><nav className="mt-7 space-y-2" aria-label="Dashboard"><Link href="/dashboard" aria-current="page" className="block rounded-md bg-paper-50/10 px-3 py-2 text-sm">Gate registry</Link><Link href="/dashboard/enroll" className="block rounded-md px-3 py-2 text-sm text-paper-200 hover:bg-paper-50/10">Enrollment</Link><Link href="/docs/contract" className="block rounded-md px-3 py-2 text-sm text-paper-200 hover:bg-paper-50/10">Contract docs</Link></nav></aside><main className="min-w-0 p-5 sm:p-8 lg:p-12"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Gate registry</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">premium-holder</h1></div><Badge variant={configured ? "secondary" : "outline"}>{configured ? "Testnet configured" : "Setup required"}</Badge></div><div className="mt-10 grid gap-5 xl:grid-cols-[1fr_1.15fr]"><section className="rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Public gate state</h2><dl className="mt-6 space-y-5 text-sm"><Data label="Contract ID" value={contractId || "Not configured"} /><Data label="Network" value="Stellar Testnet" /><Data label="Policy hash" value={state?.policyHash ?? "Unavailable until deployment"} /><Data label="Credential root" value={state?.root ?? "Unavailable until deployment"} /><Data label="Epoch" value={String(state?.epoch ?? 1)} /><Data label="Updated at" value={state?.updatedAt ?? "No live read"} /><Data label="Verifier freshness" value={freshness} /></dl></section><ContractActions contractId={contractId} rpcUrl={rpcUrl} configured={configured} /></div><section className="mt-5 rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">Routine login stays off-chain. This workspace uses Freighter only for administrative contract writes. No secret key is requested or stored.</section></main></div></div>;
}

function Data({ label, value }: { label: string; value: string }) { return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{value}</dd></div>; }
