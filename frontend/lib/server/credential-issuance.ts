import type { GatePolicy } from "@/packages/server/src/verifier";

type IssuanceInput = {
  gateId: string;
  commitment: string;
  issuerPublicKey: string;
  policy: Pick<GatePolicy, "active" | "epoch" | "credentialRoot">;
  expiresAt: string;
};

export function buildIssuedCredentialPayload({
  gateId,
  commitment,
  issuerPublicKey,
  policy,
  expiresAt,
}: IssuanceInput) {
  if (!policy.active) throw new Error("Gate is not active");

  return {
    gateId,
    epoch: policy.epoch,
    commitment,
    credentialRoot: policy.credentialRoot,
    expiresAt,
    issuerPublicKey,
  };
}
