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
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-paper-50/10 bg-paper-50/[0.025] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm text-paper-200">
          <span className="grid size-8 place-items-center rounded-xl bg-signal-400/10 text-signal-400">
            {mode === "standard" ? (
              <WalletIcon aria-hidden="true" size={17} weight="duotone" />
            ) : (
              <EyeSlashIcon aria-hidden="true" size={17} weight="duotone" />
            )}
          </span>
          <span className="font-medium text-paper-50">Received by host</span>
        </div>
        <span className="font-mono text-[0.6875rem] text-paper-200">
          {selectedApp.origin}
        </span>
      </div>

      <div className="bg-ink-950 p-2">
        <div className="grid gap-2 rounded-[1.15rem] bg-ink-900/86 p-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={mode === "standard" ? "secondary" : "ghost"}
            aria-pressed={mode === "standard"}
            onClick={() => setMode("standard")}
            className="min-h-11 justify-center rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            Standard wallet login
          </Button>
          <Button
            type="button"
            variant={mode === "veilpass" ? "default" : "ghost"}
            aria-pressed={mode === "veilpass"}
            onClick={() => setMode("veilpass")}
            className="min-h-11 justify-center rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            VeilPass login
          </Button>
        </div>

        <div className="relative mt-2 overflow-hidden rounded-[1.15rem] border border-paper-50/[0.07] bg-ink-950 p-5 sm:p-6">
          <div aria-hidden="true" className="absolute right-[-8rem] top-[-8rem] size-72 rounded-full bg-signal-400/10 blur-3xl" />
          <div aria-hidden="true" className="absolute bottom-[-7rem] left-[22%] size-64 rounded-full bg-signal-400/[0.055] blur-3xl transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" />
          <div className="relative">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-paper-50">
                    {mode === "standard" ? "Public account" : "Scoped account"}
                  </p>
                  <p className="mt-1 text-xs text-paper-200">
                    {mode === "standard"
                      ? "The same address can appear across services."
                      : "The address stops before the host boundary."}
                  </p>
                </div>
                <span className="rounded-full border border-line-dark px-2.5 py-1 font-mono text-[0.6875rem] text-paper-200">
                  Stellar testnet
                </span>
              </div>

              <div
                data-testid="hero-payload"
                aria-live="polite"
                className="mt-5 grid gap-2 rounded-2xl border border-paper-50/10 bg-paper-50/[0.035] p-3 font-mono text-[0.75rem] text-paper-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                {Object.entries(payload).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid min-h-10 gap-2 rounded-xl bg-ink-950/72 px-3 py-2 sm:grid-cols-[9rem_1fr] sm:items-center"
                  >
                    <span className="text-paper-200">{key}</span>
                    <span className="text-paper-50 [overflow-wrap:anywhere]">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-paper-200">
                <GlobeHemisphereWestIcon
                  aria-hidden="true"
                  className="text-signal-400"
                  size={16}
                />
                {mode === "standard"
                  ? "Explorer-readable identifier"
                  : `${selectedApp.label} only`}
              </div>
              {mode === "veilpass" ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={app === "app-a" ? "secondary" : "ghost"}
                    aria-pressed={app === "app-a"}
                    onClick={() => setApp("app-a")}
                    className="rounded-full"
                  >
                    Use App A
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={app === "app-b" ? "secondary" : "ghost"}
                    aria-pressed={app === "app-b"}
                    onClick={() => setApp("app-b")}
                    className="rounded-full"
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
