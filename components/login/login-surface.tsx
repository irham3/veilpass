"use client";

import { EyeSlashIcon } from "@phosphor-icons/react/EyeSlash";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { challengeResponseSchema, proofResultSchema, type ChallengeResponse } from "@/packages/shared/src/contracts";
import { loadCredential } from "@/packages/credential/src/store";
import type { StoredCredential } from "@/packages/credential/src/schema";

export function LoginSurface({ gateId, state, hostOrigin }: { gateId: string; state: string; hostOrigin: string }) {
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [status, setStatus] = useState("Waiting for host challenge");
  useEffect(() => {
    if (!window.opener) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== hostOrigin || event.source !== window.opener || event.data?.type !== "veilpass:challenge" || event.data?.state !== state) return;
      const parsed = challengeResponseSchema.safeParse(event.data.challenge);
      if (!parsed.success || parsed.data.gateId !== gateId || parsed.data.origin !== hostOrigin) { setStatus("Challenge binding rejected"); return; }
      setChallenge(parsed.data); setStatus("Challenge bound to this host");
    };
    window.addEventListener("message", receive);
    window.opener.postMessage({ type: "veilpass:ready", state }, hostOrigin);
    return () => window.removeEventListener("message", receive);
  }, [gateId, hostOrigin, state]);
  useEffect(() => { void loadCredential(gateId).then((value) => { setCredential(value); if (!value) setStatus("No local credential. Enroll in this browser first."); }); }, [gateId]);

  async function prove() {
    if (!challenge || !credential || !window.opener) return;
    setStatus("Creating simulated integration proof");
    const derive = async (label: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${credential.subjectSecret}:${label}`)))).map((value) => value.toString(16).padStart(2, "0")).join("");
    const response = await fetch("/api/proof/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge, credential: { gateId: credential.gateId, epoch: credential.epoch, commitment: credential.commitment, credentialRoot: credential.credentialRoot, expiresAt: credential.expiresAt, issuerPublicKey: credential.issuerPublicKey, issuerSignature: credential.issuerSignature }, derived: { privateAppId: `vp_${(await derive(`private:${hostOrigin}`)).slice(0, 24)}`, loginNullifier: await derive(`nullifier:${challenge.challenge}`), revocationHash: await derive(`revoke:${gateId}`) } }) });
    const body = await response.json();
    const parsed = proofResultSchema.safeParse(body);
    if (!parsed.success) { setStatus(body?.error ?? "Proof service unavailable"); return; }
    window.opener.postMessage({ type: "veilpass:proof", state, payload: parsed.data }, hostOrigin);
    setStatus("Proof sent to the host verifier");
  }

  return <main className="grid min-h-screen place-items-center bg-ink-950 p-5 text-paper-50"><section className="w-full max-w-md rounded-2xl border border-line-dark bg-ink-900 p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-signal-400/10 text-signal-400"><EyeSlashIcon size={24} weight="duotone" /></span><Badge variant="outline" className="border-signal-400/40 text-signal-400">Simulated proof</Badge></div><h1 className="mt-8 text-3xl font-semibold tracking-[-0.035em]">Private login</h1><p className="mt-3 text-sm leading-6 text-paper-200">Prove the local credential meets <strong className="text-paper-50">{gateId}</strong>. The host receives a scoped ID, not a wallet address.</p><dl className="mt-7 space-y-3 rounded-xl border border-line-dark bg-ink-950 p-4 text-xs"><div><dt className="text-paper-200">Host origin</dt><dd className="mt-1 break-all font-mono">{hostOrigin}</dd></div><div><dt className="text-paper-200">Credential</dt><dd className="mt-1">{credential ? "Available in IndexedDB" : "Not found"}</dd></div><div><dt className="text-paper-200">Status</dt><dd className="mt-1" aria-live="polite">{status}</dd></div></dl><Button className="mt-6 w-full" size="lg" disabled={!challenge || !credential} onClick={prove}>Continue with local credential</Button><p className="mt-4 text-xs leading-5 text-paper-200">This integration adapter is deterministic and forgeable by design. It is not a zero-knowledge proof.</p></section></main>;
}
