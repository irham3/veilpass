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
    leafIndex: witness.leafIndex,
    leafNonce: witness.leafNonce,
    merklePath: witness.merklePath,
    pathIsRight: witness.pathIsRight,
    revocationHash: witness.revocationHash,
    expiresAt,
    issuerPublicKey,
  };
}

type SignedCredentialFields = Pick<
  ReturnType<typeof buildIssuedCredentialPayload>,
  | "gateId"
  | "epoch"
  | "commitment"
  | "credentialSalt"
  | "leafNonce"
  | "revocationHash"
  | "expiresAt"
  | "issuerPublicKey"
>;

export function issuedCredentialCanonical(payload: SignedCredentialFields): string {
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
