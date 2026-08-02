import "server-only";

import type { GatePolicy } from "@/packages/server/src/verifier";
import { readGateState, readRevocationState } from "@/packages/shared/src/contract";

export function isAllowedGate(gateId: string): boolean {
  const allowed = (process.env.VEILPASS_GATE_IDS ?? "premium-holder").split(",").map((value) => value.trim()).filter(Boolean);
  return allowed.includes(gateId);
}

export async function getGatePolicy(gateId = "premium-holder"): Promise<GatePolicy> {
  const contractId = process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
  const sourceAccount = process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT;
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  if (contractId && sourceAccount) {
    const live = await readGateState({ contractId, gateId, rpcUrl, sourceAccount });
    return { active: true, epoch: live.epoch, credentialRoot: Buffer.from(live.credential_root).toString("hex"), isRevoked: (revocationHash) => readRevocationState({ contractId, gateId, revocationHash, rpcUrl, sourceAccount }) };
  }
  return {
    active: process.env.VEILPASS_GATE_REVOKED !== "true",
    epoch: Number.parseInt(process.env.VEILPASS_GATE_EPOCH ?? "1", 10),
    credentialRoot: process.env.VEILPASS_CREDENTIAL_ROOT ?? "testnet-root-v1",
  };
}
