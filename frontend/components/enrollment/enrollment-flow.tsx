"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { WalletIcon } from "@phosphor-icons/react/Wallet";
import { getNetworkDetails, isConnected, requestAccess, signMessage, signTransaction } from "@stellar/freighter-api";
import { Asset, Horizon, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { publicAppLinks } from "@/lib/public-app-links";
import { issuedCredentialSchema } from "@/packages/credential/src/schema";
import { saveCredential } from "@/packages/credential/src/store";
import { createCredentialSecrets } from "@/packages/proof/src/noir";

const gateId = "premium-holder";
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
export const FREIGHTER_INSTALL_URL = "https://freighter.app/";

type AssetRule = { type: "native" | "credit"; code: string; issuer?: string; minimum: number };
type Eligibility = { eligible?: boolean; hasTrustline?: boolean };
type ApiError = { error?: string; requestId?: string };
type ClaimChallenge = { challengeId: string; message: string };
type EnrollmentPhase = "ready" | "connecting" | "checking" | "preparing" | "signing" | "issuing" | "saving" | "complete";

const enrollmentSteps = [
  { label: "Connect wallet", detail: "Allow address access" },
  { label: "Check eligibility", detail: "Confirm Testnet and balance" },
  { label: "Sign message", detail: "Approve the off-chain request" },
  { label: "Save credential", detail: "Wait for local confirmation" },
] as const;

function phaseStep(phase: EnrollmentPhase) {
  if (phase === "connecting") return 0;
  if (phase === "checking" || phase === "preparing") return 1;
  if (phase === "signing") return 2;
  if (phase === "issuing" || phase === "saving" || phase === "complete") return 3;
  return -1;
}

export function enrollmentButtonLabel(input: { disclosed: boolean; complete: boolean; busy: boolean; phase: EnrollmentPhase; usesNativeXlm: boolean }) {
  if (!input.disclosed) return "Check the box above to continue";
  if (input.complete) return "Credential enrolled";
  if (!input.busy) return input.usesNativeXlm ? "Connect Freighter and enroll" : "Enroll this wallet";
  if (input.phase === "connecting") return "Waiting for Freighter…";
  if (input.phase === "signing") return "Approve the message in Freighter…";
  if (input.phase === "issuing" || input.phase === "saving") return "Finishing enrollment…";
  return "Checking wallet…";
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function isFreighterMissing(message: string): boolean {
  return /freighter was not found/i.test(message);
}

export function enrollmentIssueMessage(error?: string, requestId?: string): string {
  if (error === "CHALLENGE_SPENT") return "This enrollment request has expired or was already used. Connect Freighter again to create a fresh request.";
  if (error === "ORIGIN_MISMATCH") return "This enrollment page was opened from an untrusted origin. Return to VeilPass and try again.";
  if (error === "PROOF_INVALID") return "The enrollment signature did not match the selected Freighter account. Keep the same Testnet account selected, then connect again.";
  if (error === "SERVICE_UNAVAILABLE") return `VeilPass could not finish enrollment right now. Your wallet was not enrolled and no funds were moved. Wait a moment, then connect Freighter again.${requestId ? ` Support reference: ${requestId}.` : ""}`;
  return "VeilPass could not finish enrollment. Connect Freighter again to create a fresh request.";
}

async function responseJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

function signedMessageText(signedMessage: string | Buffer) {
  return typeof signedMessage === "string" ? signedMessage : signedMessage.toString("base64");
}

function assertExpectedSigner(expectedAddress: string, signerAddress: string) {
  if (!signerAddress || signerAddress !== expectedAddress) {
    throw new Error("Freighter signed with a different account. Select the same Testnet account and connect again.");
  }
}

export function EnrollmentFlow({ assetRule, returnTo }: { assetRule: AssetRule; returnTo?: string }) {
  const router = useRouter();
  const [disclosed, setDisclosed] = useState(false);
  const [status, setStatus] = useState("Check the disclosure box, then connect Freighter.");
  const [complete, setComplete] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyAction, setBusyAction] = useState<"prepare" | "enroll" | null>(null);
  const [phase, setPhase] = useState<EnrollmentPhase>("ready");
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const usesNativeXlm = assetRule.type === "native";

  async function copyAssetDetails() {
    try {
      await navigator.clipboard.writeText(`${assetRule.code}:${assetRule.issuer}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  async function connectTestnetWallet() {
    setPhase("connecting");
    setStatus("Waiting for Freighter. Approve the connection request, or open the extension from your browser toolbar if no window appears.");
    const connection = await withTimeout(isConnected(), 10_000, "Freighter did not respond. Open or unlock the extension, then try again.");
    if (!connection.isConnected || connection.error) throw new Error("Freighter was not found. Install or unlock Freighter, then try again.");
    const access = await withTimeout(requestAccess(), 60_000, "Freighter did not return an account. Open the extension, finish or cancel the pending request, then try again.");
    if (access.error || !access.address) throw new Error("Wallet access was rejected.");
    setWalletLabel(`${access.address.slice(0, 6)}…${access.address.slice(-6)}`);
    setPhase("checking");
    setStatus("Wallet connected. Confirming Stellar Testnet and the required balance.");
    const network = await withTimeout(getNetworkDetails(), 10_000, "Freighter did not report its network. Reopen the extension and confirm Stellar Testnet.");
    if (network.error || network.networkPassphrase !== Networks.TESTNET) throw new Error("Switch Freighter to Stellar Testnet, then try again.");
    return access.address;
  }

  async function readEligibility(address: string) {
    const response = await fetch("/api/enrollment/eligibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
    const eligibility = await responseJson<Eligibility>(response);
    if (!response.ok || !eligibility) throw new Error("VeilPass could not check this Testnet wallet. Try again in a moment.");
    return eligibility;
  }

  async function createTrustline(address: string) {
    setStatus(`Approve the ${assetRule.code} trustline in Freighter`);
    const account = await horizon.loadAccount(address);
    const transaction = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.changeTrust({ asset: new Asset(assetRule.code, assetRule.issuer) }))
      .setTimeout(180)
      .build();
    const signed = await signTransaction(transaction.toXDR(), { networkPassphrase: Networks.TESTNET, address });
    if (signed.error || !signed.signedTxXdr) throw new Error("Trustline approval was rejected.");
    setStatus("Publishing the Testnet trustline");
    await horizon.submitTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET));
  }

  async function waitForEligibility(address: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const eligibility = await readEligibility(address);
      if (eligibility.eligible) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 1_500));
    }
    return false;
  }

  async function completeEnrollment(address: string) {
    setPhase("preparing");
    setStatus("Wallet is eligible. Creating a credential secret locally in this browser.");
    const { subjectSecret, credentialSalt, commitment } = await createCredentialSecrets();
    setStatus("Creating a fresh one-time enrollment request.");
    const challengeResponse = await fetch("/api/enrollment/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, gateId }) });
    const challenge = await responseJson<{ challengeId: string; message: string; gateId: string } & ApiError>(challengeResponse);
    if (!challengeResponse.ok || !challenge) {
      if (challenge?.error === "NOT_ELIGIBLE") throw new Error(usesNativeXlm
        ? `The active Freighter account needs at least ${assetRule.minimum} XLM on Stellar Testnet.`
        : `The active Freighter account needs at least ${assetRule.minimum} ${assetRule.code}. Select “Prepare demo wallet” to set up the Testnet fixture.`);
      throw new Error("Enrollment issuer is not configured. Try again in a moment.");
    }
    setPhase("signing");
    setStatus("Freighter needs one more approval. Review and sign the enrollment message; this is not a transaction and cannot move funds.");
    const signed = await withTimeout(signMessage(challenge.message, { networkPassphrase: Networks.TESTNET, address }), 90_000, "The signature request timed out. Open Freighter, cancel any old request, then connect again for a fresh challenge.");
    if (signed.error || !signed.signedMessage) throw new Error("Enrollment message signing was rejected.");
    assertExpectedSigner(address, signed.signerAddress);
    setPhase("issuing");
    setStatus("Signature approved. VeilPass is issuing the credential and updating the Testnet gate.");
    const issueResponse = await fetch("/api/enrollment/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, address, message: challenge.message, gateId: challenge.gateId, signature: signedMessageText(signed.signedMessage), commitment, credentialSalt }),
    });
    if (!issueResponse.ok) {
      const errorBody = await responseJson<ApiError>(issueResponse);
      throw new Error(enrollmentIssueMessage(errorBody?.error, errorBody?.requestId));
    }
    const issued = issuedCredentialSchema.safeParse(await responseJson<unknown>(issueResponse));
    if (!issued.success) throw new Error("Issuer returned an unexpected response shape. Try again in a moment.");
    setPhase("saving");
    setStatus("Credential issued. Saving it only in this browser.");
    await saveCredential({ ...issued.data, subjectSecret, storedAt: new Date().toISOString() });
    setComplete(true);
    setPhase("complete");
    if (returnTo) {
      setStatus("Credential stored. Returning to private login…");
      window.setTimeout(() => router.replace(returnTo), 500);
    } else {
      setStatus("Credential stored in this browser");
    }
  }

  async function enrollExistingWallet() {
    try {
      setIssue(null);
      const address = await connectTestnetWallet();
      setPhase("checking");
      setStatus(`Checking this wallet for at least ${assetRule.minimum} ${assetRule.code} on Stellar Testnet.`);
      if (!(await readEligibility(address)).eligible) throw new Error(usesNativeXlm
        ? `This wallet needs at least ${assetRule.minimum} XLM on Stellar Testnet. Fund it with Friendbot, then try again.`
        : `This wallet does not yet have ${assetRule.minimum} ${assetRule.code}. Select “Prepare demo wallet” — no swap or purchase is required.`);
      await completeEnrollment(address);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "Enrollment failed.");
      setStatus("Enrollment paused. Follow the recovery message below, then start again with a fresh request.");
    } finally {
      setBusyAction(null);
    }
  }

  async function prepareDemoWallet() {
    try {
      setIssue(null);
      const address = await connectTestnetWallet();
      setPhase("checking");
      setStatus(`Checking this wallet for at least ${assetRule.minimum} ${assetRule.code} on Stellar Testnet.`);
      let eligibility = await readEligibility(address);
      if (eligibility.eligible) {
        await completeEnrollment(address);
        return;
      }
      if (!eligibility.hasTrustline) {
        await createTrustline(address);
        setStatus("Confirming the Testnet trustline");
        for (let attempt = 0; attempt < 5; attempt += 1) {
          eligibility = await readEligibility(address);
          if (eligibility.hasTrustline) break;
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
        if (!eligibility.hasTrustline) throw new Error(`The ${assetRule.code} trustline is still being indexed by Testnet. Wait a moment, then select “Prepare demo wallet” again.`);
      }

      setStatus("Creating a wallet-bound demo claim");
      const challengeResponse = await fetch("/api/demo-asset/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
      const challenge = await responseJson<ClaimChallenge & ApiError>(challengeResponse);
      if (!challengeResponse.ok || !challenge) {
        if (challenge?.error === "ASSET_CLAIMED") {
          if (await waitForEligibility(address)) {
            await completeEnrollment(address);
            return;
          }
          throw new Error(`This wallet has already used its one-time ${assetRule.code} Testnet setup. If you removed the asset, add the same custom asset again and contact the demo operator.`);
        }
        if (challenge?.error === "ASSET_TRUSTLINE_REQUIRED") throw new Error(`Freighter did not publish the ${assetRule.code} trustline yet. Wait a moment, then try again.`);
        throw new Error("The demo asset service is temporarily unavailable. Try again in a moment.");
      }

      setStatus("Approve the one-time Testnet claim in Freighter");
      const signed = await signMessage(challenge.message, { networkPassphrase: Networks.TESTNET, address });
      if (signed.error || !signed.signedMessage) throw new Error("Demo asset claim signing was rejected.");
      assertExpectedSigner(address, signed.signerAddress);
      setStatus(`Issuing ${assetRule.minimum} ${assetRule.code} on Testnet`);
      const issueResponse = await fetch("/api/demo-asset/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, address, message: challenge.message, signature: signedMessageText(signed.signedMessage) }),
      });
      const issuance = await responseJson<{ ok?: boolean } & ApiError>(issueResponse);
      if (!issueResponse.ok || !issuance?.ok) {
        if (issuance?.error === "ASSET_CLAIMED" && await waitForEligibility(address)) {
          await completeEnrollment(address);
          return;
        }
        if (issuance?.error === "RATE_LIMITED") throw new Error("The Testnet demo wallet limit has been reached. Try again tomorrow or contact the demo operator.");
        throw new Error("The demo asset could not be issued safely. Wait a moment and check the wallet again before retrying.");
      }
      setStatus("Waiting for Testnet to index the demo balance");
      if (!(await waitForEligibility(address))) throw new Error(`The demo balance was sent but Testnet has not indexed it yet. Wait a moment, then select “I already have ${assetRule.code} — enroll”.`);
      await completeEnrollment(address);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "Demo wallet setup failed.");
      setStatus("Wallet setup paused. Follow the recovery message below, then start again.");
    } finally {
      setBusyAction(null);
    }
  }

  const disabled = !disclosed || complete || busyAction !== null;
  const activeStep = phaseStep(phase);
  const enrollLabel = enrollmentButtonLabel({ disclosed, complete, busy: busyAction === "enroll", phase, usesNativeXlm });

  return (
    <section className="rounded-[1.75rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:rounded-[2rem]">
      <div className="rounded-[1.35rem] bg-ink-900/92 p-5 sm:rounded-[1.6rem] sm:p-8">
        <div className="flex flex-col gap-5 border-b border-paper-50/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-signal-400/10 text-signal-400"><WalletIcon aria-hidden="true" size={22} weight="duotone" /></span>
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Prepare a Testnet wallet, then enroll.</h2>
              <p className="mt-2 text-sm leading-6 text-paper-200 sm:text-base sm:leading-7">VeilPass stores a new credential only in this browser after Freighter proves control of an eligible account.</p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-paper-50/12 px-3 py-1.5 font-mono text-xs text-paper-200">Stellar Testnet</span>
        </div>

        <section aria-labelledby="wallet-requirements" className="mt-6 rounded-[1.35rem] border border-signal-400/22 bg-signal-400/[0.055] p-5 sm:p-6">
          <div className="flex gap-3">
            <ShieldCheckIcon aria-hidden="true" size={22} weight="duotone" className="mt-0.5 shrink-0 text-signal-400" />
            <div>
              <h3 id="wallet-requirements" className="text-lg font-semibold tracking-[-0.025em]">One Testnet eligibility rule</h3>
              <p className="mt-1 text-sm leading-6 text-paper-200">{usesNativeXlm ? `This demo checks for at least ${assetRule.minimum} XLM on Stellar Testnet. No custom asset, trustline, swap, or purchase is required.` : `This demo checks for at least ${assetRule.minimum} ${assetRule.code}. It is a Testnet fixture for the gate, not a VeilPass token sale or a requirement for host dApps.`}</p>
            </div>
          </div>
          <ol className="mt-5 grid gap-4 text-sm leading-6 text-paper-200 sm:grid-cols-3">
            <li className="border-t border-paper-50/10 pt-3"><strong className="block text-paper-50">1. Use Testnet</strong>Switch Freighter to Stellar Testnet before connecting.</li>
            <li className="border-t border-paper-50/10 pt-3"><strong className="block text-paper-50">2. {usesNativeXlm ? "Fund XLM" : "Prepare demo wallet"}</strong>{usesNativeXlm ? `Keep at least ${assetRule.minimum} XLM in the Testnet account. No trustline is needed.` : "Approve one custom-asset trustline and a one-time wallet-bound claim."}</li>
            <li className="border-t border-paper-50/10 pt-3"><strong className="block text-paper-50">3. Enroll privately</strong>VeilPass issues the local credential; host apps never receive the wallet address.</li>
          </ol>
          {usesNativeXlm ? <div className="mt-5 rounded-xl border border-paper-50/10 bg-ink-950/60 p-3"><p className="font-mono text-xs text-paper-200">Native Testnet balance</p><p className="mt-1 font-mono text-xs leading-5 text-paper-50">XLM ≥ {assetRule.minimum}</p></div> : <div className="mt-5 grid gap-3 rounded-xl border border-paper-50/10 bg-ink-950/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0"><p className="font-mono text-xs text-paper-200">Testnet custom asset</p><p className="mt-1 break-all font-mono text-xs leading-5 text-paper-50">{assetRule.code}:{assetRule.issuer}</p></div>
            <Button type="button" variant="outline" size="default" onClick={copyAssetDetails} className="min-h-11 rounded-full border-paper-50/18 bg-transparent px-4 hover:bg-paper-50/8">{copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}{copied ? "Copied" : "Copy asset"}</Button>
          </div>}
        </section>

        <Alert className="mt-5 rounded-[1.35rem] border-paper-50/12 bg-ink-950/50 p-5 text-paper-50">
          <AlertTitle>What enrollment reveals</AlertTitle>
          <AlertDescription className="mt-2 leading-6 text-paper-200">The issuer sees your Stellar address to verify wallet control and its public Testnet balance. {usesNativeXlm ? `The gate requires at least ${assetRule.minimum} XLM.` : `The demo balance is fixed at ${assetRule.minimum} ${assetRule.code}, once per wallet.`} Host apps do not receive that address. Clearing site data removes this browser credential.</AlertDescription>
        </Alert>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl p-1 text-sm leading-6 text-paper-200 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-ring">
          <Checkbox checked={disclosed} onCheckedChange={(value) => setDisclosed(value === true)} className="mt-1" />
          <span>I understand what the issuer can observe and that this does not provide network anonymity.</span>
        </label>

        <section aria-labelledby="enrollment-progress-title" className="mt-6 rounded-[1.35rem] border border-paper-50/12 bg-ink-950/55 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div>
              <h3 id="enrollment-progress-title" className="font-semibold tracking-[-0.02em]">What happens after you click</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-paper-200">Keep this tab open. Freighter may show a connection approval, then a message-signing approval. If the connection was approved before, it can go straight to the signature request.</p>
            </div>
            {walletLabel ? <span className="w-fit shrink-0 rounded-full border border-paper-50/12 px-3 py-1.5 font-mono text-xs text-paper-200">Account {walletLabel}</span> : null}
          </div>

          <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {enrollmentSteps.map((step, index) => {
              const done = phase === "complete" || index < activeStep;
              const current = index === activeStep && phase !== "complete";
              return (
                <li key={step.label} aria-current={current ? "step" : undefined} className={`rounded-xl border p-3 transition-colors duration-150 ${done ? "border-signal-400/28 bg-signal-400/[0.07]" : current ? "border-signal-400/45 bg-signal-400/[0.1]" : "border-paper-50/8 bg-paper-50/[0.025]"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-signal-400 text-ink-950" : current ? "border border-signal-400 text-signal-400" : "border border-paper-50/20 text-paper-200"}`}>{done ? <CheckIcon aria-hidden="true" size={14} weight="bold" /> : index + 1}</span>
                    <strong className="text-sm text-paper-50">{step.label}</strong>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-paper-200">{step.detail}</p>
                </li>
              );
            })}
          </ol>

          <div role="status" aria-live="assertive" className={`mt-4 rounded-xl border px-4 py-3 ${busyAction ? "border-signal-400/35 bg-signal-400/[0.08]" : "border-paper-50/8 bg-paper-50/[0.025]"}`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-signal-400">Current status</p>
            <p className="mt-1 text-sm leading-6 text-paper-50">{status}</p>
          </div>
        </section>

        {issue ? <Alert variant="destructive" className="mt-5 rounded-[1.35rem] border-alert-400/35 bg-alert-400/[0.08] p-5"><AlertTitle>Enrollment could not continue</AlertTitle><AlertDescription className="mt-2 leading-6">{issue}</AlertDescription>{isFreighterMissing(issue) ? <a href={FREIGHTER_INSTALL_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-paper-50/20 px-4 py-2 text-sm font-medium text-paper-50 underline-offset-4 transition-colors hover:border-paper-50/40 hover:bg-paper-50/10 hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring">Install or download Freighter ↗</a> : null}</Alert> : null}

        {complete && !returnTo ? <Alert className="mt-5 rounded-[1.35rem] border-signal-400/35 bg-signal-400/[0.08] p-5 text-paper-50"><AlertTitle>Credential stored in this browser</AlertTitle><AlertDescription className="mt-2 leading-6 text-paper-200">Enrollment is complete. Continue to either host app; each app receives its own private ID and never receives this wallet address.</AlertDescription><div className="mt-4 flex flex-wrap gap-3"><Button asChild size="default" className="rounded-full"><a href={publicAppLinks.appA}>Continue to App A</a></Button><Button asChild size="default" variant="outline" className="rounded-full border-paper-50/18 bg-transparent text-paper-50 hover:bg-paper-50/8"><a href={publicAppLinks.appB}>Continue to App B</a></Button></div></Alert> : null}

        <div className="mt-6 border-t border-paper-50/10 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {!usesNativeXlm ? <Button type="button" size="lg" className="min-h-12 rounded-full px-5 disabled:opacity-100 disabled:border-transparent disabled:bg-paper-200/10 disabled:text-paper-200/70" disabled={disabled} onClick={() => { setBusyAction("prepare"); void prepareDemoWallet(); }}><SparkleIcon aria-hidden="true" />{complete ? "Credential enrolled" : busyAction === "prepare" ? "Preparing Testnet wallet…" : "Prepare demo wallet"}</Button> : null}
            <Button type="button" size="lg" variant={usesNativeXlm ? "default" : "outline"} className={`min-h-12 rounded-full px-5 disabled:cursor-not-allowed disabled:opacity-100 disabled:border-paper-50/8 disabled:bg-paper-200/8 disabled:text-paper-200/65 ${usesNativeXlm ? "" : "border-paper-50/18 bg-transparent hover:bg-paper-50/8"}`} disabled={disabled} aria-describedby={!disclosed ? "enrollment-button-help" : undefined} onClick={() => { setBusyAction("enroll"); void enrollExistingWallet(); }}>{enrollLabel}</Button>
          </div>
          {!disclosed ? <p id="enrollment-button-help" className="mt-3 text-sm leading-6 text-signal-400">First, check the disclosure box directly above the progress panel. The button will then become available.</p> : <p className="mt-3 text-sm leading-6 text-paper-200">After clicking, watch the Current status panel above and complete any Freighter request before returning to this tab.</p>}
          <p className="mt-1 text-xs leading-5 text-paper-300">{usesNativeXlm ? "A Testnet XLM balance is all this gate checks; no asset trustline, swap, or purchase is required." : `No XLM-to-${assetRule.code} swap or ${assetRule.code} purchase is required for this Testnet demo.`}</p>
        </div>
      </div>
    </section>
  );
}
