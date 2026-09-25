import "server-only";

import type { GatePolicy } from "@/packages/server/src/verifier";
import { readGateState, readRevocationState } from "@/packages/shared/src/contract";

export function isAllowedGate(gateId: string): boolean {
  const allowed = (process.env.VEILPASS_GATE_IDS ?? "premium-holder").split(",").map((value) => value.trim()).filter(Boolean);
  return allowed.includes(gateId);
}

function fallbackPolicy(): GatePolicy {
  return {
    active: process.env.VEILPASS_GATE_REVOKED !== "true",
    epoch: Number.parseInt(process.env.VEILPASS_GATE_EPOCH ?? "1", 10),
    credentialRoot: process.env.VEILPASS_CREDENTIAL_ROOT ?? "testnet-root-v1",
  };
}

export async function getGatePolicy(gateId = "premium-holder"): Promise<GatePolicy> {
  const contractId = process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
  const sourceAccount = process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT;
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  if (contractId && sourceAccount) {
    try {
      const live = await readGateState({ contractId, gateId, rpcUrl, sourceAccount });
      return {
        active: true,
        epoch: live.epoch,
        owner: live.owner,
        credentialRoot: Buffer.from(live.credential_root).toString("hex"),
        isRevoked: async (revocationHash) => {
          try {
            return await readRevocationState({ contractId, gateId, revocationHash, rpcUrl, sourceAccount });
          } catch (error) {
            console.error(`[gate-policy] readRevocationState failed for ${gateId}:`, error);
            return false;
          }
        },
      };
    } catch (error) {
      console.warn(`[gate-policy] readGateState failed for ${gateId}, checking fallback policy:`, error);
      if (process.env.VEILPASS_CREDENTIAL_ROOT) {
        return fallbackPolicy();
      }
      throw error;
    }
  }
  return fallbackPolicy();
}
