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

  return (
    <section className="rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5">
      <div className="rounded-[1.4rem] bg-ink-900/92 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              Contract operations
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-paper-200">
              Freighter approves each Testnet write before submission.
            </p>
          </div>
          <span className="rounded-full bg-signal-400/10 px-3 py-1 font-mono text-[0.6875rem] text-signal-400">
            Testnet
          </span>
        </div>

        <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm text-paper-200">
            Gate ID
            <Input
              value={gateId}
              onChange={(event) => setGateId(event.target.value)}
              className="mt-2 w-full rounded-2xl border-paper-50/10 bg-ink-950 text-paper-50"
            />
          </label>
          <label className="min-w-0 text-sm text-paper-200">
            32-byte value (hex)
            <Input
              value={hash}
              onChange={(event) => setHash(event.target.value)}
              className="mt-2 w-full rounded-2xl border-paper-50/10 bg-ink-950 font-mono text-xs text-paper-50"
            />
          </label>
        </div>

        <Tabs defaultValue="create" className="mt-6">
          <TabsList className="h-auto flex-wrap rounded-full bg-ink-950 p-1">
            <TabsTrigger value="create" className="rounded-full">
              Create gate
            </TabsTrigger>
            <TabsTrigger value="rotate" className="rounded-full">
              Rotate epoch
            </TabsTrigger>
            <TabsTrigger value="revoke" className="rounded-full">
              Revoke
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Button className="rounded-full" disabled={!configured} onClick={() => submit("create")}>
              Simulate and create
            </Button>
          </TabsContent>
          <TabsContent value="rotate">
            <Button className="rounded-full" disabled={!configured} onClick={() => submit("rotate")}>
              Simulate and rotate
            </Button>
          </TabsContent>
          <TabsContent value="revoke">
            <Button className="rounded-full" variant="destructive" disabled={!configured} onClick={() => submit("revoke")}>
              Simulate and revoke
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-6 border-t border-paper-50/10 pt-4">
          <p className="text-sm text-paper-200" aria-live="polite">
            {status}
          </p>
          {txHash ? (
            <a
              className="mt-2 inline-block font-mono text-xs text-signal-400 underline underline-offset-4 [overflow-wrap:anywhere]"
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {txHash}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
