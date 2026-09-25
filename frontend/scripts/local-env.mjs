#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildLocalEnvText, buildSetupSummary } from "./local-env-format.mjs";

export const DEFAULT_TESTNET_DEPLOYMENT = {
  hostOrigin: "http://localhost:3000",
  loginOrigin: "http://localhost:3000",
  rpcUrl: "https://soroban-testnet.stellar.org",
  contractId: "CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK",
  sourceAccount: "GDVP7QVOCQ4L4CDNXVWD53ATXGYDXTDOYVFPJ3UA5OTWJW7XGXSNFXRJ",
  gateId: "premium-holder",
  gateEpoch: 1,
  credentialRoot: "0000000000000000000000000000000000000000000000000000000000000000",
  assetType: "native",
  assetCode: "XLM",
  minBalance: "1",
};

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return value;
}

export async function runLocalEnvSetup(args = process.argv.slice(2), cwd = process.cwd()) {
  const force = args.includes("--force");
  const envPath = path.resolve(cwd, valueAfter(args, "--env-path", ".env.local"));

  if (!force && existsSync(envPath)) {
    throw new Error(`${envPath} already exists. Re-run with --force to replace it.`);
  }

  // Keep the wallet SDK out of the import path used by the pure env-file unit
  // tests. It is only needed when this executable actually creates an issuer.
  const { Keypair } = await import("@stellar/stellar-sdk");
  const issuer = Keypair.random();
  const values = {
    ...DEFAULT_TESTNET_DEPLOYMENT,
    hostOrigin: valueAfter(args, "--host-origin", DEFAULT_TESTNET_DEPLOYMENT.hostOrigin),
    loginOrigin: valueAfter(args, "--login-origin", DEFAULT_TESTNET_DEPLOYMENT.loginOrigin),
    assetIssuer: "",
    simulatorKey: randomBytes(32).toString("hex"),
    issuerSecret: issuer.secret(),
    fixtureCredential: randomBytes(32).toString("hex"),
  };

  await writeFile(envPath, buildLocalEnvText(values), { encoding: "utf8", flag: force ? "w" : "wx", mode: 0o600 });
  return buildSetupSummary({ envPath, funded: false, values });
}

// `process.argv[1]` is absent in some test/module-loader contexts. Guard it
// before constructing a file URL so this CLI module remains safely importable.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalEnvSetup()
    .then((summary) => {
      console.log(summary);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
