import "server-only";

import { Asset, Horizon, Keypair, Networks, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";

const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;

export type DemoAssetConfig = {
  assetCode: string;
  assetIssuer: string;
  amount: string;
  issuerSecret: string;
};

/** Reads the Testnet-only demo rule. The issuer secret is deliberately never returned to a route response. */
export function getDemoAssetConfig(): DemoAssetConfig | null {
  const assetCode = process.env.VEILPASS_ASSET_CODE?.trim();
  const assetIssuer = process.env.VEILPASS_ASSET_ISSUER?.trim();
  const amount = process.env.VEILPASS_MIN_BALANCE?.trim();
  const issuerSecret = process.env.VEILPASS_ISSUER_SECRET?.trim();
  if (!assetCode || !/^[A-Za-z0-9]{1,12}$/.test(assetCode) || !assetIssuer || !StrKey.isValidEd25519PublicKey(assetIssuer) || !amount || !amountPattern.test(amount) || Number(amount) <= 0 || !issuerSecret) return null;

  try {
    if (Keypair.fromSecret(issuerSecret).publicKey() !== assetIssuer) return null;
    return { assetCode, assetIssuer, amount, issuerSecret };
  } catch {
    return null;
  }
}

/** Sends the fixed demo amount after the route has verified a wallet-owned, one-time claim. */
export async function issueDemoAsset({ config, destination }: { config: DemoAssetConfig; destination: string }): Promise<string> {
  if (!StrKey.isValidEd25519PublicKey(destination)) throw new Error("Invalid Testnet destination");
  const issuer = Keypair.fromSecret(config.issuerSecret);
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await server.loadAccount(issuer.publicKey());
  const transaction = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination, asset: new Asset(config.assetCode, config.assetIssuer), amount: config.amount }))
    .setTimeout(180)
    .build();
  transaction.sign(issuer);
  return (await server.submitTransaction(transaction)).hash;
}
