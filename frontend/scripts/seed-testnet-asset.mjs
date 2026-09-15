#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";

function parseEnvText(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}

function requireConfig(env) {
  for (const key of ["VEILPASS_ASSET_CODE", "VEILPASS_ASSET_ISSUER", "VEILPASS_ISSUER_SECRET"]) {
    if (!env[key]) throw new Error(`Missing ${key} in .env.local`);
  }
  return {
    code: env.VEILPASS_ASSET_CODE,
    issuer: env.VEILPASS_ASSET_ISSUER,
    issuerSecret: env.VEILPASS_ISSUER_SECRET,
  };
}

async function assetAlreadyDiscoverable(code, issuer) {
  const response = await fetch(`${horizonUrl}/assets?asset_code=${encodeURIComponent(code)}&asset_issuer=${encodeURIComponent(issuer)}&limit=1`);
  if (!response.ok) throw new Error(`Could not query Horizon asset directory (${response.status})`);
  const body = await response.json();
  return body._embedded?.records?.length > 0;
}

async function submit(server, source, signer, operation) {
  const transaction = new TransactionBuilder(source, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(operation)
    .setTimeout(180)
    .build();
  transaction.sign(signer);
  return (await server.submitTransaction(transaction)).hash;
}

async function main() {
  const env = parseEnvText(await readFile(".env.local", "utf8"));
  const config = requireConfig(env);
  const issuer = Keypair.fromSecret(config.issuerSecret);
  if (issuer.publicKey() !== config.issuer) throw new Error("VEILPASS_ISSUER_SECRET does not match VEILPASS_ASSET_ISSUER");

  if (await assetAlreadyDiscoverable(config.code, config.issuer)) {
    console.log(`Asset ${config.code}:${config.issuer} is already discoverable on Stellar Testnet.`);
    return;
  }

  const server = new Horizon.Server(horizonUrl);
  const distribution = Keypair.random();
  const createHash = await submit(
    server,
    await server.loadAccount(config.issuer),
    issuer,
    Operation.createAccount({ destination: distribution.publicKey(), startingBalance: "2" }),
  );
  const asset = new Asset(config.code, config.issuer);
  const trustHash = await submit(
    server,
    await server.loadAccount(distribution.publicKey()),
    distribution,
    Operation.changeTrust({ asset }),
  );
  const issueHash = await submit(
    server,
    await server.loadAccount(config.issuer),
    issuer,
    Operation.payment({ destination: distribution.publicKey(), asset, amount: "1" }),
  );

  console.log(JSON.stringify({
    assetCode: config.code,
    issuer: config.issuer,
    distributionAccount: distribution.publicKey(),
    transactions: { createHash, trustHash, issueHash },
    note: "A one-unit Testnet distribution balance makes the asset discoverable. No secret was printed or stored.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
