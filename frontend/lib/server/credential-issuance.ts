import type { GatePolicy } from "@/packages/server/src/verifier";
import type { MerkleWitness } from "./credential-tree";

type IssuanceInput = {
  gateId: string;
  commitment: string;
  credentialSalt: string;
  witness: MerkleWitness;
  issuerPublicKey: string;
  policy: Pick<GatePolicy, "active" | "epoch">;
  expiresAt: string;
};

export function buildIssuedCredentialPayload({
  gateId,
  commitment,
  credentialSalt,
  witness,
  issuerPublicKey,
  policy,
  expiresAt,
}: IssuanceInput) {
  if (!policy.active) throw new Error("Gate is not active");

  return {
    gateId,
    epoch: policy.epoch,
    commitment,
    credentialSalt,
    credentialRoot: witness.credentialRoot,
    leafNonce: witness.leafNonce,
    merklePath: witness.merklePath,
    pathIsRight: witness.pathIsRight,
    revocationHash: witness.revocationHash,
    expiresAt,
    issuerPublicKey,
  };
}

export function issuedCredentialCanonical(payload: ReturnType<typeof buildIssuedCredentialPayload>): string {
  return JSON.stringify([
    payload.gateId,
    payload.epoch,
    payload.commitment,
    payload.credentialSalt,
    payload.leafNonce,
    payload.revocationHash,
    payload.expiresAt,
    payload.issuerPublicKey,
  ]);
}
