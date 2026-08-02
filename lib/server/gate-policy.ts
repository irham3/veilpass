import "server-only";

import type { GatePolicy } from "@/packages/server/src/verifier";

export function isAllowedGate(gateId: string): boolean {
  const allowed = (process.env.VEILPASS_GATE_IDS ?? "premium-holder").split(",").map((value) => value.trim()).filter(Boolean);
  return allowed.includes(gateId);
}

export function getGatePolicy(): GatePolicy {
  return {
    active: process.env.VEILPASS_GATE_REVOKED !== "true",
    epoch: Number.parseInt(process.env.VEILPASS_GATE_EPOCH ?? "1", 10),
    credentialRoot: process.env.VEILPASS_CREDENTIAL_ROOT ?? "testnet-root-v1",
    revocationHash: process.env.VEILPASS_REVOCATION_HASH ?? "testnet-revocation-v1",
  };
}
