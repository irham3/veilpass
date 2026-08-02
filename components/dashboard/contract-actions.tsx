"use client";

import { requestAccess, signTransaction } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client } from "@/packages/contract-bindings/src";

export function ContractActions({ contractId, rpcUrl, configured }: { contractId: string; rpcUrl: string; configured: boolean }) {
  const [status, setStatus] = useState(configured ? "Ready to simulate" : "Add the public contract environment values to enable writes");
  const [txHash, setTxHash] = useState("");
  const [gateId, setGateId] = useState("premium-holder");
  const [hash, setHash] = useState("00".repeat(32));

  async function submit(kind: "create" | "rotate" | "revoke") {
    if (!configured || !/^[a-f0-9]{64}$/i.test(hash)) return;
    try {
      setTxHash(""); setStatus("Connecting Freighter on Testnet");
      const access = await requestAccess(); if (access.error || !access.address) throw new Error("Wallet access rejected");
      const client = new Client({ contractId, rpcUrl, networkPassphrase: Networks.TESTNET, publicKey: access.address, signTransaction });
      setStatus("Simulating contract transaction");
      const bytes = Buffer.from(hash, "hex");
      const assembled = kind === "create" ? await client.create_gate({ owner: access.address, gate_id: gateId, policy_hash: bytes, root: bytes }) : kind === "rotate" ? await client.rotate_epoch({ owner: access.address, gate_id: gateId, new_root: bytes }) : await client.revoke({ owner: access.address, gate_id: gateId, revocation_hash: bytes });
      setStatus("Awaiting Freighter approval");
      const sent = await assembled.signAndSend();
      const submittedHash = sent.sendTransactionResponse?.hash ?? "";
      setTxHash(submittedHash); setStatus("Confirmed on Stellar Testnet");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Transaction failed"); }
  }

  return <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Contract operations</h2><p className="mt-2 text-sm text-muted-foreground">Every write is simulated, approved in Freighter, submitted, then awaited for confirmation.</p></div><span className="rounded-full bg-muted px-3 py-1 font-mono text-[0.6875rem]">Testnet</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="text-sm">Gate ID<Input value={gateId} onChange={(event) => setGateId(event.target.value)} className="mt-2" /></label><label className="text-sm">32-byte value (hex)<Input value={hash} onChange={(event) => setHash(event.target.value)} className="mt-2 font-mono text-xs" /></label></div><Tabs defaultValue="create" className="mt-6"><TabsList><TabsTrigger value="create">Create gate</TabsTrigger><TabsTrigger value="rotate">Rotate epoch</TabsTrigger><TabsTrigger value="revoke">Revoke</TabsTrigger></TabsList><TabsContent value="create"><Button disabled={!configured} onClick={() => submit("create")}>Simulate and create</Button></TabsContent><TabsContent value="rotate"><Button disabled={!configured} onClick={() => submit("rotate")}>Simulate and rotate</Button></TabsContent><TabsContent value="revoke"><Button variant="destructive" disabled={!configured} onClick={() => submit("revoke")}>Simulate and revoke</Button></TabsContent></Tabs><div className="mt-6 border-t border-border pt-4"><p className="text-sm text-muted-foreground" aria-live="polite">{status}</p>{txHash ? <a className="mt-2 inline-block break-all font-mono text-xs underline underline-offset-4" href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a> : null}</div></section>;
}
