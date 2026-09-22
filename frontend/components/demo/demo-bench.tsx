"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/ArrowCounterClockwise";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { EyeSlashIcon } from "@phosphor-icons/react/EyeSlash";
import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { useState } from "react";

import { PixelTransition } from "@/components/effects/pixel-transition";
import { SpotlightCard } from "@/components/effects/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDemoState, runDemoLogin, type DemoApp, type DemoState } from "@/lib/demo/machine";
import { publicAppLinks } from "@/lib/public-app-links";
import type { VerifyResult } from "@/packages/shared/src/contracts";

const appDetails = {
  "app-a": {
    label: "App A",
    origin: publicAppLinks.appA,
    purpose: "Holder dashboard",
    description: "A private member area that accepts the gate verdict without receiving a wallet address.",
  },
  "app-b": {
    label: "App B",
    origin: publicAppLinks.appB,
    purpose: "Private feedback",
    description: "A second host that receives a different private ID from the same local credential.",
  },
} as const;

type Event = { label: string; result: VerifyResult };

export function DemoBench() {
  const [app, setApp] = useState<DemoApp>("app-a");
  const [state, setState] = useState<DemoState>(createDemoState);
  const [events, setEvents] = useState<Event[]>([]);
  const [standard, setStandard] = useState(false);
  const latest = events[0]?.result;

  function selectApp(value: string) {
    if (value === "app-a" || value === "app-b") {
      setApp(value);
      setStandard(false);
    }
  }

  function login(activeApp: DemoApp, replay = false) {
    const next = runDemoLogin(state, activeApp, { replay });
    setState(next.state);
    setEvents((current) => [
      {
        label: replay ? "Replayed challenge" : `VeilPass login at ${appDetails[activeApp].label}`,
        result: next.result,
      },
      ...current,
    ].slice(0, 6));
    setStandard(false);
  }

  function standardLogin(activeApp: DemoApp) {
    setStandard(true);
    const result: VerifyResult = {
      ok: false,
      error: "SERVICE_UNAVAILABLE",
      requestId: "standard-payload-below",
    };
    setEvents((current) => [
      { label: `Standard wallet login at ${appDetails[activeApp].label}`, result },
      ...current,
    ].slice(0, 6));
  }

  function reset() {
    setState(createDemoState());
    setEvents([]);
    setStandard(false);
  }

  return (
    <Tabs value={app} onValueChange={selectApp} className="flex-col gap-4">
      <div className="flex flex-col gap-5 rounded-[1.6rem] border border-paper-50/10 bg-ink-900/92 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h3 className="text-xl font-semibold tracking-[-0.035em] sm:text-2xl">Choose the host you want to inspect</h3>
          <p className="mt-2 text-sm leading-6 text-paper-200">The demo stays on this page. Switch hosts to compare the origin-scoped result.</p>
        </div>
        <TabsList aria-label="Demo host application" className="grid h-auto w-full grid-cols-2 rounded-[1.2rem] border border-paper-50/10 bg-ink-950/80 p-1.5 lg:w-[30rem]">
          {(Object.keys(appDetails) as DemoApp[]).map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="h-auto min-h-16 flex-col items-start rounded-[0.9rem] px-4 py-3 text-left text-paper-200 data-[state=active]:bg-signal-400 data-[state=active]:text-ink-950 data-[state=active]:shadow-none"
            >
              <span className="text-sm font-semibold">{appDetails[key].label}</span>
              <span className="text-xs font-normal opacity-75">{appDetails[key].purpose}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {(Object.keys(appDetails) as DemoApp[]).map((key) => {
        const details = appDetails[key];
        return (
          <TabsContent key={key} value={key} className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <SpotlightCard className="rounded-[1.85rem] border border-paper-50/10 bg-ink-900/92 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-7">
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="border-signal-400/40 text-signal-400">Interactive simulation</Badge>
                    <h4 className="mt-4 text-2xl font-semibold">{details.purpose}</h4>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-paper-200">{details.description}</p>
                    <p className="mt-2 break-all font-mono text-xs text-paper-300">{details.origin}</p>
                  </div>
                  <Badge variant={state.revoked ? "destructive" : "secondary"}>{state.revoked ? "Credential revoked" : "Credential active"}</Badge>
                </div>

                <PixelTransition
                  active={Boolean(latest || standard)}
                  first={(
                    <div className="grid min-h-72 place-items-center rounded-[1.35rem] border border-dashed border-paper-50/12 bg-ink-950/70 p-8 text-center">
                      <div>
                        <EyeSlashIcon className="mx-auto text-signal-400" size={34} weight="duotone" />
                        <p className="mt-4 font-medium">No host session yet</p>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-paper-200">Compare a public wallet payload with a minimized VeilPass response.</p>
                      </div>
                    </div>
                  )}
                  second={(
                    <div className="mt-7 min-h-72 rounded-[1.35rem] border border-paper-50/10 bg-ink-950 p-5">
                      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-paper-200">Host received</p>
                      <pre data-testid="demo-payload" aria-live="polite" className="mt-4 overflow-x-auto font-mono text-xs leading-6 text-paper-200"><code>{JSON.stringify(standard ? { walletAddress: "GBRPUBLIC7B5E6K2P", network: "TESTNET", balance: "public via Horizon" } : latest ?? {}, null, 2)}</code></pre>
                    </div>
                  )}
                  className="mt-7"
                />

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
                  <Button type="button" size="lg" variant="outline" className="rounded-full" onClick={() => standardLogin(key)}><WalletIcon />Standard wallet login</Button>
                  <Button type="button" size="lg" className="rounded-full" onClick={() => login(key)}><EyeSlashIcon />Login with VeilPass</Button>
                </div>
                <div className="relative mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={!state.lastChallengeSpent} onClick={() => login(key, true)}><ArrowCounterClockwiseIcon />Replay last challenge</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={state.revoked} onClick={() => setState((current) => ({ ...current, revoked: true }))}><ProhibitIcon />Revoke credential</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={reset}>Reset bench</Button>
                </div>

                <div className="relative mt-6 flex flex-col gap-4 border-t border-paper-50/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-xs leading-5 text-paper-200">The live login opens in a new browser tab because App A and App B need separate origins to prove that their private IDs differ.</p>
                  <Button asChild size="default" variant="outline" className="shrink-0 rounded-full border-paper-50/18 bg-transparent text-paper-50 hover:bg-paper-50/8">
                    <a href={details.origin} target="_blank" rel="noreferrer">Open live {details.label}<ArrowSquareOutIcon aria-hidden="true" /></a>
                  </Button>
                </div>
              </SpotlightCard>

              <aside className="rounded-[1.85rem] border border-paper-50/10 bg-ink-900/92 p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Verification log</h4>
                  <span className="font-mono text-[0.6875rem] text-paper-200">Last 6</span>
                </div>
                <ol className="mt-5 space-y-3" aria-live="polite">
                  {events.length ? events.map((event, index) => (
                    <li key={`${event.label}-${index}`} className="rounded-2xl border border-paper-50/10 bg-ink-950 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs leading-5">{event.label}</p>
                        <span className={event.result.ok ? "text-signal-400" : "text-alert-400"}>{event.result.ok ? "PASS" : "REJECT"}</span>
                      </div>
                      <p className="mt-2 break-all font-mono text-[0.625rem] text-paper-200">{event.result.ok ? event.result.privateAppId : event.result.error}</p>
                    </li>
                  )) : (
                    <li className="text-sm leading-6 text-paper-200">Actions appear here with minimized outcomes. No wallet address is written to this log.</li>
                  )}
                </ol>
              </aside>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
