import "server-only";

import { Keypair, Networks } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";

import { Client } from "@/packages/contract-bindings/src";
import { canonicalFieldHex } from "@/packages/shared/src/field";
import { readGateState } from "@/packages/shared/src/contract";

export const gateRootPublisherConfigured = Boolean(process.env.VEILPASS_GATE_OWNER_SECRET);

/**
 * The issuer can only make an issued Merkle witness usable after the gate
 * owner has published its new root. This signer is intentionally separate
 * from the enrollment issuer key so deployments can use distinct duties.
 */
export async function publishCredentialRoot({ gateId, expectedEpoch, newRoot }: { gateId: string; expectedEpoch: number; newRoot: string }): Promise<void> {
  const ownerSecret = process.env.VEILPASS_GATE_OWNER_SECRET;
  const contractId = process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  if (!ownerSecret || !contractId) throw new Error("Gate root publisher is not configured");

  const owner = Keypair.fromSecret(ownerSecret);
  const state = await readGateState({ contractId, gateId, rpcUrl, sourceAccount: owner.publicKey() });
  if (state.owner !== owner.publicKey()) throw new Error("Configured root signer does not own this gate");
  if (state.epoch !== expectedEpoch) throw new Error("Gate epoch changed before root publication");

  const client = new Client({
    contractId,
    rpcUrl,
    networkPassphrase: Networks.TESTNET,
    publicKey: owner.publicKey(),
    signTransaction: basicNodeSigner(owner, Networks.TESTNET).signTransaction,
  });
  const transaction = await client.update_root({
    owner: owner.publicKey(),
    gate_id: gateId,
    expected_epoch: expectedEpoch,
    new_root: Buffer.from(canonicalFieldHex(newRoot), "hex"),
  });
  await transaction.signAndSend();
}
