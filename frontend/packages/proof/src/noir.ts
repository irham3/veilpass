"use client";

import { Noir } from "@noir-lang/noir_js";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";

import type { StoredCredential } from "../../credential/src/schema";
import {
  base64urlToBytes,
  canonicalFieldHex,
  fieldHexFromBytes,
  fieldHexToNoir,
  hashBytesToFieldHex,
  hashTextToFieldHex,
  u64ToFieldHex,
} from "../../shared/src/field";
import { proofResultSchema, type ChallengeResponse, type ProofResult, type PublicInputs } from "../../shared/src/contracts";

type CompiledCircuit = { bytecode: string };

let circuitPromise: Promise<CompiledCircuit> | undefined;

async function loadCircuit(): Promise<CompiledCircuit> {
  circuitPromise ??= fetch("/proof/veilpass_membership.json", { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error("The pinned VeilPass circuit artifact is unavailable");
      return response.json() as Promise<CompiledCircuit>;
    });
  return circuitPromise;
}

function fieldBytes(value: string): Uint8Array {
  return Uint8Array.from(canonicalFieldHex(value).match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function seconds(isoTime: string): number {
  const milliseconds = Date.parse(isoTime);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error("Invalid credential timestamp");
  return Math.floor(milliseconds / 1_000);
}

async function pedersenHash(api: Barretenberg, inputs: string[]): Promise<string> {
  const result = await api.pedersenHash({ inputs: inputs.map(fieldBytes), hashIndex: 0 });
  return fieldHexFromBytes(result.hash);
}

function expectedProofFields(input: { credential: StoredCredential; gateIdHash: string; originHash: string; challengeHash: string; proofExpiresAt: string; proofCreatedAt: string; privateAppId: string; loginNullifier: string }): string[] {
  return [
    input.credential.commitment,
    input.credential.credentialRoot,
    input.gateIdHash,
    u64ToFieldHex(input.credential.epoch),
    input.originHash,
    input.challengeHash,
    u64ToFieldHex(seconds(input.proofExpiresAt)),
    u64ToFieldHex(seconds(input.proofCreatedAt)),
    input.privateAppId,
    input.loginNullifier,
    input.credential.revocationHash,
  ].map(canonicalFieldHex);
}

/** Generate an UltraHonk membership proof entirely in the hosted-login page. */
export async function proveMembership({ challenge, credential, onStatus }: { challenge: ChallengeResponse; credential: StoredCredential; onStatus?: (message: string) => void }): Promise<ProofResult> {
  const createdAt = new Date();
  const proofCreatedAt = createdAt.toISOString();
  const proofExpiresAt = new Date(Math.min(Date.parse(challenge.expiresAt), Date.parse(credential.expiresAt))).toISOString();
  if (Date.parse(proofExpiresAt) <= createdAt.getTime()) throw new Error("The credential or login challenge has expired");

  onStatus?.("Loading the pinned membership circuit");
  const circuit = await loadCircuit();
  const gateIdHash = await hashTextToFieldHex(`veilpass:gate:${credential.gateId}`);
  const originHash = await hashTextToFieldHex(`veilpass:origin:${challenge.origin}`);
  const challengeHash = await hashBytesToFieldHex(base64urlToBytes(challenge.challenge));

  onStatus?.("Initializing the local proving engine");
  const api = await Barretenberg.new();
  try {
    const privateAppId = await pedersenHash(api, [credential.subjectSecret, gateIdHash, originHash]);
    const loginNullifier = await pedersenHash(api, [credential.subjectSecret, challengeHash]);
    const publicInputs: PublicInputs = {
      gateId: credential.gateId,
      epoch: credential.epoch,
      origin: challenge.origin,
      challengeHash,
      credentialCommitment: credential.commitment,
      credentialRoot: credential.credentialRoot,
      privateAppId,
      loginNullifier,
      revocationHash: credential.revocationHash,
      proofCreatedAt,
      proofExpiresAt,
    };
    const noir = new Noir(circuit as never);
    await noir.init();
    onStatus?.("Creating the membership proof locally");
    const execution = await noir.execute({
      subject_secret: fieldHexToNoir(credential.subjectSecret),
      credential_salt: fieldHexToNoir(credential.credentialSalt),
      credential_expiry: seconds(credential.expiresAt),
      leaf_nonce: fieldHexToNoir(credential.leafNonce),
      merkle_path: credential.merklePath.map(fieldHexToNoir),
      path_is_right: credential.pathIsRight,
      credential_commitment: fieldHexToNoir(credential.commitment),
      credential_root: fieldHexToNoir(credential.credentialRoot),
      gate_id_hash: fieldHexToNoir(gateIdHash),
      epoch: credential.epoch,
      normalized_origin_hash: fieldHexToNoir(originHash),
      challenge_hash: fieldHexToNoir(challengeHash),
      proof_expiry: seconds(proofExpiresAt),
      current_time: seconds(proofCreatedAt),
      private_app_id: fieldHexToNoir(privateAppId),
      login_nullifier: fieldHexToNoir(loginNullifier),
      revocation_hash: fieldHexToNoir(credential.revocationHash),
    });
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    const generated = await backend.generateProof(execution.witness);
    const expected = expectedProofFields({ credential, gateIdHash, originHash, challengeHash, proofExpiresAt, proofCreatedAt, privateAppId, loginNullifier });
    if (generated.publicInputs.map(canonicalFieldHex).join("") !== expected.join("")) throw new Error("Proof public inputs did not match the bound login request");
    return proofResultSchema.parse({ challengeId: challenge.challengeId, proof: base64(generated.proof), publicInputs });
  } finally {
    await api.destroy();
  }
}

/** Used at enrollment before the wallet ever sends its public credential commitment. */
export async function createCredentialSecrets(): Promise<{ subjectSecret: string; credentialSalt: string; commitment: string }> {
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const saltBytes = crypto.getRandomValues(new Uint8Array(32));
  secretBytes[0] &= 0x1f;
  saltBytes[0] &= 0x1f;
  const subjectSecret = fieldHexFromBytes(secretBytes);
  const credentialSalt = fieldHexFromBytes(saltBytes);
  const api = await Barretenberg.new({ skipSrsInit: true });
  try {
    return { subjectSecret, credentialSalt, commitment: await pedersenHash(api, [subjectSecret, credentialSalt]) };
  } finally {
    await api.destroy();
  }
}
