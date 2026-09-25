"use client";

import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import { EyeSlashIcon } from "@phosphor-icons/react/EyeSlash";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { credentialWitnessSchema, type StoredCredential } from "@/packages/credential/src/schema";
import { loadCredential, saveCredential } from "@/packages/credential/src/store";
import { proveMembership } from "@/packages/proof/src/noir";
import { challengeResponseSchema, proofResultSchema, type ChallengeResponse } from "@/packages/shared/src/contracts";

export function LoginSurface({ gateId, state, hostOrigin }: { gateId: string; state: string; hostOrigin: string }) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [credentialLoading, setCredentialLoading] = useState(true);
  const [isProving, setIsProving] = useState(false);
  const [channelIssue, setChannelIssue] = useState<string | null>(null);
  const [status, setStatus] = useState("Connecting securely to the host app");

  useEffect(() => {
    const opener = window.opener;
    if (!opener) {
      const message = "This login window lost its connection to the host app. Close it, then click Login with VeilPass again.";
      const disconnectedTimeout = window.setTimeout(() => {
        setChannelIssue(message);
        setStatus(message);
      }, 0);
      return () => window.clearTimeout(disconnectedTimeout);
    }

    let readyInterval: number | null = null;
    const announceReady = () => opener.postMessage({ type: "veilpass:ready", state }, hostOrigin);
    const receive = (event: MessageEvent) => {
      if (event.origin !== hostOrigin || event.source !== opener || event.data?.type !== "veilpass:challenge" || event.data?.state !== state) return;
      const parsed = challengeResponseSchema.safeParse(event.data.challenge);
      if (!parsed.success || parsed.data.gateId !== gateId || parsed.data.origin !== hostOrigin) {
        setChannelIssue("The host challenge did not match this login request. Close this window and try again.");
        setStatus("Challenge binding rejected");
        return;
      }
      if (readyInterval) window.clearInterval(readyInterval);
      setChallenge(parsed.data);
      setChannelIssue(null);
      setStatus("Secure challenge received. Ready to continue.");
    };

    window.addEventListener("message", receive);
    announceReady();
    readyInterval = window.setInterval(announceReady, 750);
    return () => {
      if (readyInterval) window.clearInterval(readyInterval);
      window.removeEventListener("message", receive);
    };
  }, [gateId, hostOrigin, state]);

  useEffect(() => {
    let active = true;
    void loadCredential(gateId)
      .then((value) => {
        if (!active) return;
        setCredential(value);
        if (!value) setStatus("No local credential. Enroll in this browser first.");
      })
      .catch(() => {
        if (!active) return;
        setChannelIssue("VeilPass could not read this browser's local credential storage.");
        setStatus("Local credential storage is unavailable");
      })
      .finally(() => {
        if (active) setCredentialLoading(false);
      });
    return () => { active = false; };
  }, [gateId]);

  function enrollThisBrowser() {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.push(`/dashboard/enroll?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function prove() {
    if (!challenge || !credential || !window.opener || isProving) return;
    setIsProving(true);
    try {
      setStatus("Refreshing the credential witness");
      const witnessResponse = await fetch("/api/credentials/witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {
            gateId: credential.gateId,
            epoch: credential.epoch,
            commitment: credential.commitment,
            credentialSalt: credential.credentialSalt,
            credentialRoot: credential.credentialRoot,
            leafNonce: credential.leafNonce,
            merklePath: credential.merklePath,
            pathIsRight: credential.pathIsRight,
            revocationHash: credential.revocationHash,
            expiresAt: credential.expiresAt,
            issuerPublicKey: credential.issuerPublicKey,
            issuerSignature: credential.issuerSignature,
          },
        }),
      });
      const witness = credentialWitnessSchema.safeParse(await witnessResponse.json());
      if (!witnessResponse.ok || !witness.success) throw new Error("Credential witness is unavailable or has been revoked");
      const freshCredential = { ...credential, ...witness.data };
      await saveCredential(freshCredential);
      const payload = await proveMembership({ challenge, credential: freshCredential, onStatus: setStatus });
      const parsed = proofResultSchema.safeParse(payload);
      if (!parsed.success) throw new Error("Local proof had an invalid response shape");
      window.opener.postMessage({ type: "veilpass:proof", state, payload: parsed.data }, hostOrigin);
      setStatus("Proof sent to the host verifier");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Local proof generation failed");
    } finally {
      setIsProving(false);
    }
  }

  const waitingForChallenge = Boolean(credential && !challenge && !channelIssue);
  const buttonLoading = credentialLoading || waitingForChallenge || isProving;
  const credentialButtonLabel = isProving
    ? "Generating private proof"
    : waitingForChallenge
      ? "Connecting to host app"
      : channelIssue
        ? "Return to host app and retry"
        : "Continue with local credential";

  return (
    <main className="aperture-field relative grid min-h-[100dvh] place-items-center overflow-hidden p-5 text-paper-50">
      <div aria-hidden="true" className="aperture-ring absolute right-[-12rem] top-[-10rem] size-[30rem] rounded-full opacity-35" />
      <section className="relative w-full max-w-md rounded-[2.1rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
        <div className="rounded-[1.6rem] bg-ink-900/94 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-signal-400/10 text-signal-400"><EyeSlashIcon aria-hidden="true" size={24} weight="duotone" /></span>
            <Badge variant="outline" className="rounded-full border-signal-400/40 text-signal-400">Local ZK proof</Badge>
          </div>
          <h1 className="mt-8 text-4xl font-semibold tracking-[-0.05em]">Private login</h1>
          <p className="mt-3 text-sm leading-6 text-paper-200">Prove <strong className="text-paper-50">{gateId}</strong>. The host receives a scoped ID, not a wallet address.</p>
          <dl className="mt-7 space-y-3 rounded-3xl border border-paper-50/10 bg-ink-950 p-4 text-xs">
            <div><dt className="text-paper-200">Host origin</dt><dd className="mt-1 break-all font-mono">{hostOrigin}</dd></div>
            <div><dt className="text-paper-200">Credential</dt><dd className="mt-1">{credentialLoading ? "Checking this browser" : credential ? "Available in IndexedDB" : "Not found"}</dd></div>
            <div><dt className="text-paper-200">Status</dt><dd className="mt-1" role={channelIssue ? "alert" : "status"} aria-live="polite">{status}</dd></div>
          </dl>

          {credentialLoading ? (
            <Button className="mt-6 min-h-12 w-full rounded-full disabled:opacity-80" size="lg" disabled aria-busy="true">
              Checking this browser
              <CircleNotchIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            </Button>
          ) : credential ? (
            <Button className="mt-6 min-h-12 w-full rounded-full disabled:opacity-80" size="lg" disabled={!challenge || isProving || Boolean(channelIssue)} aria-busy={buttonLoading} onClick={prove}>
              {credentialButtonLabel}
              {buttonLoading ? <CircleNotchIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
            </Button>
          ) : (
            <Button className="mt-6 min-h-12 w-full rounded-full" size="lg" disabled={Boolean(channelIssue)} onClick={enrollThisBrowser}>Enroll this browser</Button>
          )}

          <p className="mt-4 text-xs leading-5 text-paper-200">{credential ? "The secret stays in this browser. The host verifier receives the proof and public inputs, including the commitment, revocation hash, and one-time nullifier, but not the wallet address." : "Enrollment uses Freighter once. After it completes, this popup resumes the private login automatically."}</p>
        </div>
      </section>
    </main>
  );
}
