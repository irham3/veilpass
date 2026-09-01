"use client";

import { EyeSlashIcon } from "@phosphor-icons/react/EyeSlash";
import { SealCheckIcon } from "@phosphor-icons/react/SealCheck";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { VeilPass, VeilPassError } from "@veilpass/sdk";
import type { VerifiedLogin } from "@veilpass/shared";

type HostApp = "app-a" | "app-b";

export function HostDemo({ app, label, purpose, accent }: { app: HostApp; label: string; purpose: string; accent: string }) {
  const [status, setStatus] = useState("No host session");
  const [login, setLogin] = useState<VerifiedLogin | null>(null);
  const loginOrigin = process.env.NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN ?? "http://login.localhost:3000";

  async function signIn() {
    setStatus("Opening VeilPass login");
    try {
      const result = await new VeilPass({ loginOrigin }).login({ gateId: "premium-holder" });
      setLogin(result);
      setStatus("Host session verified");
    } catch (error) {
      setStatus(error instanceof VeilPassError ? error.code : "SERVICE_UNAVAILABLE");
    }
  }

  return <main className="aperture-field relative grid min-h-screen place-items-center overflow-hidden p-5 text-paper-50"><div aria-hidden="true" className="aperture-ring absolute -right-24 -top-24 size-96 rounded-full opacity-35" /><section className="relative w-full max-w-2xl rounded-[2.1rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 shadow-[0_40px_120px_rgba(0,0,0,0.42)]"><div className="rounded-[1.6rem] bg-ink-900/94 p-6 sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{label} · separate host origin</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.055em]">{purpose}</h1></div><span className="grid size-12 place-items-center rounded-2xl bg-signal-400/10 text-signal-400"><EyeSlashIcon size={24} weight="duotone" /></span></div><p className="mt-4 max-w-xl leading-7 text-paper-200">{accent}</p><dl className="mt-8 grid gap-3 rounded-3xl border border-paper-50/10 bg-ink-950 p-4 text-sm"><div><dt className="text-paper-200">This host origin</dt><dd className="mt-1 break-all font-mono text-paper-50">{typeof window === "undefined" ? `${app}.localhost` : window.location.origin}</dd></div><div><dt className="text-paper-200">Login origin</dt><dd className="mt-1 break-all font-mono text-paper-50">{loginOrigin}</dd></div><div><dt className="text-paper-200">Session status</dt><dd className="mt-1 flex items-center gap-2 text-paper-50" aria-live="polite">{login ? <SealCheckIcon className="text-signal-400" weight="fill" /> : null}{status}</dd></div></dl><Button size="lg" className="mt-7 w-full rounded-full" onClick={signIn}><EyeSlashIcon />Login with VeilPass</Button>{login ? <pre className="mt-5 overflow-x-auto rounded-2xl border border-signal-400/20 bg-signal-400/5 p-4 text-xs leading-6 text-paper-100"><code>{JSON.stringify(login, null, 2)}</code></pre> : <p className="mt-4 text-xs leading-5 text-paper-200">The successful payload contains a scoped private ID and gate result only. It never contains a Stellar wallet address.</p>}</div></section></main>;
}
