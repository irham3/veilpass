"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/ArrowCounterClockwise";
import { EyeSlashIcon } from "@phosphor-icons/react/EyeSlash";
import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { useState } from "react";

import { PixelTransition } from "@/components/effects/pixel-transition";
import { SpotlightCard } from "@/components/effects/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createDemoState, runDemoLogin, type DemoApp, type DemoState } from "@/lib/demo/machine";
import type { VerifyResult } from "@/packages/shared/src/contracts";

const appDetails = {
  "app-a": { label: "App A", origin: "http://localhost:3000", purpose: "Holder dashboard" },
  "app-b": { label: "App B", origin: "http://127.0.0.1:3000", purpose: "Private feedback" },
} as const;

type Event = { label: string; result: VerifyResult };

export function DemoBench() {
  const [app, setApp] = useState<DemoApp>("app-a");
  const [state, setState] = useState<DemoState>(createDemoState);
  const [events, setEvents] = useState<Event[]>([]);
  const [standard, setStandard] = useState(false);
  const latest = events[0]?.result;

  function login(replay = false) {
    const next = runDemoLogin(state, app, { replay });
    setState(next.state);
    setEvents((current) => [{ label: replay ? "Replayed challenge" : `VeilPass login at ${appDetails[app].label}`, result: next.result }, ...current].slice(0, 6));
    setStandard(false);
  }

  function standardLogin() {
    setStandard(true);
    const result: VerifyResult = { ok: false, error: "SERVICE_UNAVAILABLE", requestId: "standard-payload-below" };
    setEvents((current) => [{ label: `Standard wallet login at ${appDetails[app].label}`, result }, ...current].slice(0, 6));
  }

  function reset() { setState(createDemoState()); setEvents([]); setStandard(false); }

  return (
    <div className="grid gap-4 xl:grid-cols-[16rem_1fr_22rem]">
      <aside className="rounded-[1.85rem] border border-paper-50/10 bg-ink-900/92 p-1.5">
        <div className="h-full rounded-[1.35rem] bg-ink-950/78 p-4">
        <p className="px-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-paper-200">Choose host origin</p>
        <div className="mt-3 space-y-2">{(Object.keys(appDetails) as DemoApp[]).map((key) => <Button key={key} type="button" variant={app === key ? "secondary" : "ghost"} className="h-auto w-full justify-start rounded-2xl px-3 py-3 text-left transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" aria-pressed={app === key} onClick={() => setApp(key)}><span><span className="block">{appDetails[key].label}</span><span className="mt-1 block font-mono text-[0.625rem] font-normal text-paper-200">{appDetails[key].origin}</span></span></Button>)}</div>
        <div className="mt-7 border-t border-line-dark pt-4"><p className="px-2 text-xs leading-5 text-paper-200">Both apps use the same local credential and gate. Their host IDs must differ.</p></div>
        </div>
      </aside>

      <SpotlightCard className="rounded-[1.85rem] border border-paper-50/10 bg-ink-900/92 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="relative flex flex-wrap items-start justify-between gap-4"><div><Badge variant="outline" className="border-signal-400/40 text-signal-400">Simulated proof</Badge><h2 className="mt-4 text-2xl font-semibold">{appDetails[app].purpose}</h2><p className="mt-1 font-mono text-xs text-paper-200">{appDetails[app].origin}</p></div><Badge variant={state.revoked ? "destructive" : "secondary"}>{state.revoked ? "Credential revoked" : "Credential active"}</Badge></div>
        <PixelTransition active={Boolean(latest || standard)} first={<div className="grid min-h-72 place-items-center rounded-[1.35rem] border border-dashed border-paper-50/12 bg-ink-950/70 p-8 text-center"><div><EyeSlashIcon className="mx-auto text-signal-400" size={34} weight="duotone" /><p className="mt-4 font-medium">No host session yet</p><p className="mt-2 max-w-sm text-sm leading-6 text-paper-200">Compare a public wallet payload with a minimized VeilPass response.</p></div></div>} second={<div className="mt-7 min-h-72 rounded-[1.35rem] border border-paper-50/10 bg-ink-950 p-5"><p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-paper-200">Host received</p><pre data-testid="demo-payload" aria-live="polite" className="mt-4 overflow-x-auto font-mono text-xs leading-6 text-paper-200"><code>{JSON.stringify(standard ? { walletAddress: "GBRPUBLIC7B5E6K2P", network: "TESTNET", balance: "public via Horizon" } : latest ?? {}, null, 2)}</code></pre></div>} className="mt-7" />
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2"><Button type="button" size="lg" variant="outline" className="rounded-full" onClick={standardLogin}><WalletIcon />Standard wallet login</Button><Button type="button" size="lg" className="rounded-full" onClick={() => login()}><EyeSlashIcon />Login with VeilPass</Button></div>
        <div className="relative mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="ghost" disabled={!state.lastChallengeSpent} onClick={() => login(true)}><ArrowCounterClockwiseIcon />Replay last challenge</Button><Button type="button" size="sm" variant="ghost" disabled={state.revoked} onClick={() => setState((current) => ({ ...current, revoked: true }))}><ProhibitIcon />Revoke credential</Button><Button type="button" size="sm" variant="ghost" onClick={reset}>Reset bench</Button></div>
      </SpotlightCard>

      <aside className="rounded-[1.85rem] border border-paper-50/10 bg-ink-900/92 p-5"><div className="flex items-center justify-between"><h2 className="font-medium">Verification log</h2><span className="font-mono text-[0.6875rem] text-paper-200">last 6</span></div><ol className="mt-5 space-y-3" aria-live="polite">{events.length ? events.map((event, index) => <li key={`${event.label}-${index}`} className="rounded-2xl border border-paper-50/10 bg-ink-950 p-3"><div className="flex items-start justify-between gap-3"><p className="text-xs leading-5">{event.label}</p><span className={event.result.ok ? "text-signal-400" : "text-alert-400"}>{event.result.ok ? "PASS" : "REJECT"}</span></div><p className="mt-2 font-mono text-[0.625rem] text-paper-200">{event.result.ok ? event.result.privateAppId : event.result.error}</p></li>) : <li className="text-sm leading-6 text-paper-200">Actions appear here with minimized outcomes. No wallet address is written to this log.</li>}</ol></aside>
    </div>
  );
}
