import { Keypair, StrKey } from "@stellar/stellar-sdk";

/** Verify a Freighter `signMessage` result using Stellar's SEP-53 format. */
export function verifyStellarMessageSignature(input: {
  address: string;
  message: string;
  signature: string;
}): boolean {
  if (!StrKey.isValidEd25519PublicKey(input.address)) return false;
  const signature = Buffer.from(input.signature, "base64");
  if (signature.length !== 64 || signature.toString("base64") !== input.signature) return false;
  return Keypair.fromPublicKey(input.address).verifyMessage(input.message, signature);
}
