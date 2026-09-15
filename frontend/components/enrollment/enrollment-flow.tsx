"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { getNetworkDetails, isConnected, requestAccess, signMessage } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { issuedCredentialSchema } from "@/packages/credential/src/schema";
import { saveCredential } from "@/packages/credential/src/store";
import { createCredentialSecrets } from "@/packages/proof/src/noir";

const gateId = "premium-holder";

type AssetRule = {
  code: string;
  issuer: string;
  minimum: number;
};

export function EnrollmentFlow({ assetRule, returnTo }: { assetRule: AssetRule; returnTo?: string }) {
  const router = useRouter();
  const [disclosed, setDisclosed] = useState(false);
  const [status, setStatus] = useState("Ready to check your Testnet wallet");
  const [complete, setComplete] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyAssetDetails() {
    try {
      await navigator.clipboard.writeText(`${assetRule.code}:${assetRule.issuer}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  async function enroll() {
    try {
      setIssue(null);
      setStatus("Checking Freighter");
      const connection = await isConnected();
      if (!connection.isConnected || connection.error) throw new Error("Freighter was not found");
      const access = await requestAccess();
      if (access.error || !access.address) throw new Error("Wallet access was rejected");
      const network = await getNetworkDetails();
      if (network.error || network.networkPassphrase !== Networks.TESTNET) throw new Error("Switch Freighter to Stellar Testnet");
      setStatus(`Checking for ${assetRule.minimum} ${assetRule.code}`);
      const eligibilityResponse = await fetch("/api/enrollment/eligibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: access.address }) });
      const eligibility = await eligibilityResponse.json().catch(() => null) as { eligible?: boolean } | null;
      if (!eligibilityResponse.ok) throw new Error("VeilPass could not check this Testnet wallet. Try again in a moment.");
      if (!eligibility?.eligible) throw new Error(`The active Freighter account needs at least ${assetRule.minimum} ${assetRule.code}. Add the asset and receive the Testnet balance before enrolling.`);
      setStatus("Creating a local credential secret");
      const { subjectSecret, credentialSalt, commitment } = await createCredentialSecrets();
      setStatus("Creating a one-time enrollment request");
      const challengeResponse = await fetch("/api/enrollment/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: access.address, gateId }) });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error === "NOT_ELIGIBLE" ? `The active Freighter account needs at least ${assetRule.minimum} ${assetRule.code}. Add the asset and receive the Testnet balance before enrolling.` : "Enrollment issuer is not configured");
      setStatus("Approve the enrollment message in Freighter");
      const signed = await signMessage(challenge.message, { networkPassphrase: Networks.TESTNET, address: access.address });
      if (signed.error || !signed.signedMessage) throw new Error("Message signing was rejected");
      const signature = typeof signed.signedMessage === "string" ? signed.signedMessage : signed.signedMessage.toString("base64");
      const issueResponse = await fetch("/api/enrollment/issue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: challenge.challengeId, address: access.address, message: challenge.message, gateId: challenge.gateId, signature, commitment, credentialSalt }) });
      const issued = issuedCredentialSchema.safeParse(await issueResponse.json());
      if (!issued.success) throw new Error("Issuer could not create the credential");
      await saveCredential({ ...issued.data, subjectSecret, storedAt: new Date().toISOString() });
      setComplete(true);
      if (returnTo) {
        setStatus("Credential stored. Returning to private login…");
        window.setTimeout(() => router.replace(returnTo), 500);
      } else {
        setStatus("Credential stored in this browser");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enrollment failed";
      setIssue(message);
      setStatus("Enrollment needs attention");
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:rounded-[2rem]">
      <div className="rounded-[1.35rem] bg-ink-900/92 p-5 sm:rounded-[1.6rem] sm:p-8">
        <div className="flex flex-col gap-5 border-b border-paper-50/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-signal-400/10 text-signal-400">
              <WalletIcon aria-hidden="true" size={22} weight="duotone" />
            </span>
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Set up the wallet, then enroll.</h2>
              <p className="mt-2 text-sm leading-6 text-paper-200 sm:text-base sm:leading-7">VeilPass stores a new credential only in this browser after Freighter proves control of an eligible account.</p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-paper-50/12 px-3 py-1.5 font-mono text-xs text-paper-200">Stellar Testnet</span>
        </div>

        <section aria-labelledby="wallet-requirements" className="mt-6 rounded-[1.35rem] border border-signal-400/22 bg-signal-400/[0.055] p-5 sm:p-6">
          <div className="flex gap-3">
            <ShieldCheckIcon aria-hidden="true" size={22} weight="duotone" className="mt-0.5 shrink-0 text-signal-400" />
            <div>
              <h3 id="wallet-requirements" className="text-lg font-semibold tracking-[-0.025em]">Before you connect</h3>
              <p className="mt-1 text-sm leading-6 text-paper-200">This gate requires at least {assetRule.minimum} {assetRule.code}. Adding the asset creates a trustline, but does not add a balance.</p>
            </div>
          </div>
          <ol className="mt-5 grid gap-4 text-sm leading-6 text-paper-200 sm:grid-cols-3">
            <li className="border-t border-paper-50/10 pt-3"><strong className="block text-paper-50">Use Testnet</strong>Switch Freighter to Stellar Testnet before connecting.</li>
            <li className="border-t border-paper-50/10 pt-3"><strong className="block text-paper-50">Add {assetRule.code}</strong>In Freighter, open Assets, choose Add asset, then choose Custom asset.</li>
            <li className="border-t border-paper-50/10 pt-3"><strong className="block text-paper-50">Receive {assetRule.minimum} {assetRule.code}</strong>Ask the VeilPass demo operator to issue the Testnet balance to your public wallet address.</li>
          </ol>
          <div className="mt-5 grid gap-3 rounded-xl border border-paper-50/10 bg-ink-950/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="font-mono text-xs text-paper-200">Custom asset</p>
              <p className="mt-1 break-all font-mono text-xs leading-5 text-paper-50">{assetRule.code}:{assetRule.issuer}</p>
            </div>
            <Button type="button" variant="outline" size="default" onClick={copyAssetDetails} className="min-h-11 rounded-full border-paper-50/18 bg-transparent px-4 hover:bg-paper-50/8">
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {copied ? "Copied" : "Copy asset"}
            </Button>
          </div>
        </section>

        <Alert className="mt-5 rounded-[1.35rem] border-paper-50/12 bg-ink-950/50 p-5 text-paper-50">
          <AlertTitle>What enrollment reveals</AlertTitle>
          <AlertDescription className="mt-2 leading-6 text-paper-200">The issuer sees your Stellar address and checks its public Testnet balance. Host apps do not receive that address. Clearing site data removes this browser credential.</AlertDescription>
        </Alert>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl p-1 text-sm leading-6 text-paper-200 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-ring">
          <Checkbox checked={disclosed} onCheckedChange={(value) => setDisclosed(value === true)} className="mt-1" />
          <span>I understand what the issuer can observe and that this does not provide network anonymity.</span>
        </label>

        {issue ? <Alert variant="destructive" className="mt-5 rounded-[1.35rem] border-alert-400/35 bg-alert-400/[0.08] p-5"><AlertTitle>Enrollment could not continue</AlertTitle><AlertDescription className="mt-2 leading-6">{issue}</AlertDescription></Alert> : null}

        <div className="mt-6 border-t border-paper-50/10 pt-6">
          <Button type="button" size="lg" className="min-h-12 w-full rounded-full px-5 sm:w-auto" disabled={!disclosed || complete} onClick={enroll}>{complete ? "Credential enrolled" : "Check wallet and enroll"}</Button>
          <p className="mt-3 text-sm leading-6 text-paper-200" aria-live="polite">{status}</p>
        </div>
      </div>
    </section>
  );
}
