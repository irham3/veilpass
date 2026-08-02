#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const REQUIRED_ENV_KEYS = ["VEILPASS_ASSET_CODE", "VEILPASS_ASSET_ISSUER", "VEILPASS_MIN_BALANCE", "VEILPASS_ISSUER_SECRET"];

export function parseEnvText(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

export function requireIssueConfig(env) {
  for (const key of REQUIRED_ENV_KEYS) {
    if (!env[key]) throw new Error(`Missing ${key} in .env.local`);
  }
  return {
    assetCode: env.VEILPASS_ASSET_CODE,
    assetIssuer: env.VEILPASS_ASSET_ISSUER,
    amount: env.VEILPASS_MIN_BALANCE,
    issuerSecret: env.VEILPASS_ISSUER_SECRET,
  };
}

export function buildIssueSummary({ assetCode, assetIssuer, destination, amount, txHash }) {
  return [
    `Issued ${amount} ${assetCode} to ${destination}`,
    `Issuer: ${assetIssuer}`,
    `Transaction: ${txHash}`,
    "No issuer secret was printed.",
  ].join("\n");
}

async function issuePayment({ config, destination, horizonUrl = "https://horizon-testnet.stellar.org" }) {
  Keypair.fromPublicKey(destination);
  const issuer = Keypair.fromSecret(config.issuerSecret);
  if (issuer.publicKey() !== config.assetIssuer) throw new Error("VEILPASS_ISSUER_SECRET does not match VEILPASS_ASSET_ISSUER");

  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(config.assetIssuer);
  const transaction = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination, asset: new Asset(config.assetCode, config.assetIssuer), amount: config.amount }))
    .setTimeout(180)
    .build();

  transaction.sign(issuer);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

export async function runIssueTestnetAsset(args = process.argv.slice(2), cwd = process.cwd()) {
  const destination = args.find((arg) => !arg.startsWith("--"));
  if (!destination) throw new Error("Usage: npm run asset:issue -- <FREIGHTER_TESTNET_PUBLIC_KEY>");
  const envPath = path.resolve(cwd, ".env.local");
  const config = requireIssueConfig(parseEnvText(await readFile(envPath, "utf8")));
  const txHash = await issuePayment({ config, destination });
  return buildIssueSummary({ ...config, destination, txHash });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIssueTestnetAsset()
    .then((summary) => {
      console.log(summary);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
