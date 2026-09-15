#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { parseEnvText } from "./issue-testnet-asset.mjs";

const horizonUrl = "https://horizon-testnet.stellar.org";

export function findMatchingOffer(records, assetCode, assetIssuer) {
  return records.find(
    (record) =>
      record.selling?.asset_code === assetCode &&
      record.selling?.asset_issuer === assetIssuer &&
      record.buying?.asset_type === "native",
  );
}

function requireLiquidityConfig(environment) {
  for (const key of [
    "VEILPASS_ASSET_CODE",
    "VEILPASS_ASSET_ISSUER",
    "VEILPASS_ISSUER_SECRET",
  ]) {
    if (!environment[key]) {
      throw new Error(`Missing ${key} in .env.local`);
    }
  }

  return {
    assetCode: environment.VEILPASS_ASSET_CODE,
    assetIssuer: environment.VEILPASS_ASSET_ISSUER,
    issuerSecret: environment.VEILPASS_ISSUER_SECRET,
    amount: environment.VEILPASS_LIQUIDITY_AMOUNT ?? "100000",
    price: environment.VEILPASS_VPT_XLM_PRICE ?? "1",
  };
}

async function readIssuerOffers(assetIssuer) {
  const response = await fetch(
    `${horizonUrl}/accounts/${encodeURIComponent(assetIssuer)}/offers?limit=200`,
  );

  if (!response.ok) {
    throw new Error(`Could not read issuer offers (${response.status})`);
  }

  const body = await response.json();
  return body._embedded?.records ?? [];
}

async function ensureLiquidity(config) {
  const issuer = Keypair.fromSecret(config.issuerSecret);

  if (issuer.publicKey() !== config.assetIssuer) {
    throw new Error(
      "VEILPASS_ISSUER_SECRET does not match VEILPASS_ASSET_ISSUER",
    );
  }

  const existingOffer = findMatchingOffer(
    await readIssuerOffers(config.assetIssuer),
    config.assetCode,
    config.assetIssuer,
  );
  const server = new Horizon.Server(horizonUrl);
  const source = await server.loadAccount(config.assetIssuer);
  const transaction = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: new Asset(config.assetCode, config.assetIssuer),
        buying: Asset.native(),
        amount: config.amount,
        price: config.price,
        offerId: existingOffer?.id ?? "0",
      }),
    )
    .setTimeout(180)
    .build();

  transaction.sign(issuer);
  const result = await server.submitTransaction(transaction);

  return {
    transactionHash: result.hash,
    offerAction: existingOffer ? "updated" : "created",
  };
}

export async function runEnsureTestnetLiquidity(cwd = process.cwd()) {
  const envPath = path.resolve(cwd, ".env.local");
  const config = requireLiquidityConfig(
    parseEnvText(await readFile(envPath, "utf8")),
  );
  const result = await ensureLiquidity(config);

  return [
    `${result.offerAction === "created" ? "Created" : "Updated"} ${config.assetCode}/XLM Testnet offer`,
    `Rate: 1 ${config.assetCode} = ${config.price} XLM`,
    `Available: ${config.amount} ${config.assetCode}`,
    `Transaction: ${result.transactionHash}`,
    "No issuer secret was printed.",
  ].join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEnsureTestnetLiquidity()
    .then((summary) => console.log(summary))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
