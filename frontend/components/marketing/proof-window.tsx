"use client";

import { EyeSlashIcon } from "@phosphor-icons/react/EyeSlash";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type LoginMode = "standard" | "veilpass";
type DemoApp = "app-a" | "app-b";

const appConfig = {
  "app-a": {
    label: "App A",
    origin: "members.example.test",
    privateAppId: "vp_appA_72f1",
  },
  "app-b": {
    label: "App B",
    origin: "feedback.example.test",
    privateAppId: "vp_appB_19c8",
  },
} as const;

export function ProofWindow() {
  const [mode, setMode] = useState<LoginMode>("standard");
  const [app, setApp] = useState<DemoApp>("app-a");
  const selectedApp = appConfig[app];
  const payload =
    mode === "standard"
      ? {
          walletAddress: "GBRP...6K2P",
          eligible: true,
          crossSiteIdentifier: "GBRP...6K2P",
        }
      : {
          eligible: true,
          privateAppId: selectedApp.privateAppId,
          gateId: "premium-holder",
        };

  return (
    <section
      aria-label="Login payload comparison"
      className="overflow-hidden rounded-[1.45rem] border border-paper-50/10 bg-ink-900 shadow-[0_32px_90px_rgba(0,0,0,0.34)]"
    >
      {/* Header bar */}
      <div className="flex min-h-12 items-center justify-between gap-2 border-b border-paper-50/10 bg-paper-50/[0.025] px-3 py-2.5 sm:min-h-14 sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2 text-sm text-paper-200">
          <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-signal-400/10 text-signal-400 sm:size-8">
            {mode === "standard" ? (
              <WalletIcon aria-hidden="true" size={15} weight="duotone" />
            ) : (
              <EyeSlashIcon aria-hidden="true" size={15} weight="duotone" />
            )}
          </span>
          <span className="font-medium text-paper-50 text-[0.8125rem] sm:text-sm">Received by host</span>
        </div>
        <span className="shrink-0 font-mono text-[0.6rem] text-paper-200 sm:text-[0.6875rem]">
          {selectedApp.origin}
        </span>
      </div>

      <div className="bg-ink-950 p-1.5 sm:p-2">
        {/* Mode toggle */}
        <div className="grid gap-1.5 rounded-[1.15rem] bg-ink-900/86 p-1.5 sm:grid-cols-2 sm:gap-2 sm:p-2">
          <Button
            type="button"
            variant={mode === "standard" ? "secondary" : "ghost"}
            aria-pressed={mode === "standard"}
            onClick={() => setMode("standard")}
            className="min-h-10 justify-center rounded-xl text-xs transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:min-h-11 sm:rounded-2xl sm:text-sm"
          >
            Standard wallet login
          </Button>
          <Button
            type="button"
            variant={mode === "veilpass" ? "default" : "ghost"}
            aria-pressed={mode === "veilpass"}
            onClick={() => setMode("veilpass")}
            className="min-h-10 justify-center rounded-xl text-xs transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:min-h-11 sm:rounded-2xl sm:text-sm"
          >
            VeilPass login
          </Button>
        </div>

        {/* Payload display */}
        <div className="relative mt-1.5 overflow-hidden rounded-[1.15rem] border border-paper-50/[0.07] bg-ink-950 p-3.5 sm:mt-2 sm:p-5 lg:p-6">
          <div aria-hidden="true" className="absolute right-[-8rem] top-[-8rem] size-72 rounded-full bg-signal-400/10 blur-3xl" />
          <div aria-hidden="true" className="absolute bottom-[-7rem] left-[22%] size-64 rounded-full bg-signal-400/[0.055] blur-3xl transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" />
          <div className="relative">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.8125rem] font-medium text-paper-50 sm:text-sm">
                    {mode === "standard" ? "Public account" : "Scoped account"}
                  </p>
                  <p className="mt-1 text-[0.7rem] leading-5 text-paper-200 sm:text-xs">
                    {mode === "standard"
                      ? "The same address can appear across services."
                      : "The address stops before the host boundary."}
                  </p>
                </div>
                <span className="rounded-full border border-line-dark px-2 py-1 font-mono text-[0.6rem] text-paper-200 sm:px-2.5 sm:text-[0.6875rem]">
                  Stellar testnet
                </span>
              </div>

              <div
                data-testid="hero-payload"
                aria-live="polite"
                className="mt-4 grid gap-1.5 rounded-xl border border-paper-50/10 bg-paper-50/[0.035] p-2 font-mono text-[0.7rem] text-paper-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mt-5 sm:gap-2 sm:rounded-2xl sm:p-3 sm:text-[0.75rem]"
              >
                {Object.entries(payload).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid min-h-9 gap-1 rounded-lg bg-ink-950/72 px-2.5 py-2 sm:min-h-10 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-2 sm:rounded-xl sm:px-3"
                  >
                    <span className="text-paper-200">{key}</span>
                    <span className="text-paper-50 break-all sm:break-words sm:[overflow-wrap:anywhere]">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer row */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 sm:mt-5 sm:gap-3">
              <div className="flex items-center gap-2 text-[0.7rem] text-paper-200 sm:text-xs">
                <GlobeHemisphereWestIcon
                  aria-hidden="true"
                  className="text-signal-400 shrink-0"
                  size={15}
                />
                {mode === "standard"
                  ? "Explorer-readable identifier"
                  : `${selectedApp.label} only`}
              </div>
              {mode === "veilpass" ? (
                <div className="flex gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={app === "app-a" ? "secondary" : "ghost"}
                    aria-pressed={app === "app-a"}
                    onClick={() => setApp("app-a")}
                    className="h-7 rounded-full px-3 text-[0.7rem] sm:h-8 sm:px-3.5 sm:text-xs"
                  >
                    Use App A
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={app === "app-b" ? "secondary" : "ghost"}
                    aria-pressed={app === "app-b"}
                    onClick={() => setApp("app-b")}
                    className="h-7 rounded-full px-3 text-[0.7rem] sm:h-8 sm:px-3.5 sm:text-xs"
                  >
                    Use App B
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
