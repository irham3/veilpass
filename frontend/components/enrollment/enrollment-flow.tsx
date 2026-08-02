"use client";

import { getNetworkDetails, isConnected, requestAccess, signMessage } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { issuedCredentialSchema } from "@/packages/credential/src/schema";
import { saveCredential } from "@/packages/credential/src/store";

const gateId = "premium-holder";

export function EnrollmentFlow() {
  const [disclosed, setDisclosed] = useState(false);
  const [status, setStatus] = useState("Ready to connect");
  const [complete, setComplete] = useState(false);

  async function enroll() {
    try {
      setStatus("Checking Freighter");
      const connection = await isConnected();
      if (!connection.isConnected || connection.error) throw new Error("Freighter was not found");
      const access = await requestAccess();
      if (access.error || !access.address) throw new Error("Wallet access was rejected");
      const network = await getNetworkDetails();
      if (network.error || network.networkPassphrase !== Networks.TESTNET) throw new Error("Switch Freighter to Stellar Testnet");
      setStatus("Checking the configured testnet asset rule");
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const subjectSecret = bytesToBase64url(secretBytes);
      const commitment = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", secretBytes))).map((value) => value.toString(16).padStart(2, "0")).join("");
      const challengeResponse = await fetch("/api/enrollment/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: access.address, gateId }) });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error === "NOT_ELIGIBLE" ? "This testnet account does not meet the asset rule" : "Enrollment issuer is not configured");
      setStatus("Approve the enrollment message in Freighter");
      const signed = await signMessage(challenge.message, { networkPassphrase: Networks.TESTNET, address: access.address });
      if (signed.error || !signed.signedMessage) throw new Error("Message signing was rejected");
      const signature = typeof signed.signedMessage === "string" ? signed.signedMessage : signed.signedMessage.toString("base64");
      const issueResponse = await fetch("/api/enrollment/issue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: challenge.challengeId, signature, commitment }) });
      const issued = issuedCredentialSchema.safeParse(await issueResponse.json());
      if (!issued.success) throw new Error("Issuer could not create the credential");
      await saveCredential({ ...issued.data, subjectSecret, storedAt: new Date().toISOString() });
      setComplete(true); setStatus("Credential stored in this browser");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Enrollment failed"); }
  }

  return <section className="rounded-[2.1rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5"><div className="rounded-[1.6rem] bg-ink-900/92 p-6 sm:p-8"><div className="max-w-2xl"><p className="font-mono text-xs uppercase tracking-[0.14em] text-signal-400">One-wallet testnet enrollment</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Store the credential in this browser.</h2><p className="mt-4 leading-7 text-paper-200">Freighter proves control of the eligible Stellar account. VeilPass generates a subject secret and keeps it local.</p></div><Alert className="mt-8 rounded-3xl border-signal-400/25 bg-signal-400/[0.07] text-paper-50"><AlertTitle>Enrollment privacy disclosure</AlertTitle><AlertDescription className="mt-2 leading-6 text-paper-200">The enrollment issuer sees your Stellar address and checks its public testnet balance. Host apps do not receive that address during login. Clearing site data removes the credential.</AlertDescription></Alert><label className="mt-6 flex items-start gap-3 text-sm leading-6 text-paper-200"><Checkbox checked={disclosed} onCheckedChange={(value) => setDisclosed(value === true)} className="mt-1" /><span>I understand what the issuer can observe and that this does not provide network anonymity.</span></label><div className="mt-7 flex flex-wrap items-center gap-4"><Button size="lg" className="rounded-full" disabled={!disclosed || complete} onClick={enroll}>{complete ? "Credential enrolled" : "Connect Freighter and enroll"}</Button><span className="text-sm text-paper-200" aria-live="polite">{status}</span></div></div></section>;
}

function bytesToBase64url(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
