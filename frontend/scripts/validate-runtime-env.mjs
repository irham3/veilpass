#!/usr/bin/env node
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

function isExactOrigin(value) {
  try {
    const origin = new URL(value);
    return (
      (origin.protocol === "https:" || origin.protocol === "http:")
      && !origin.username
      && !origin.password
      && origin.pathname === "/"
      && !origin.search
      && !origin.hash
      && origin.origin === value.replace(/\/$/, "")
    );
  } catch {
    return false;
  }
}

function isOriginAllowlist(value) {
  if (!value) return false;
  const configuredOrigins = value.split(",");
  const origins = configuredOrigins.map((origin) => origin.trim()).filter(Boolean);
  return origins.length > 0 && origins.length === configuredOrigins.length && origins.every(isExactOrigin) && new Set(origins).size === origins.length;
}

function isPostgresUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:") && Boolean(url.hostname) && Boolean(url.pathname && url.pathname !== "/") && Boolean(url.username);
  } catch {
    return false;
  }
}

function isAssetRule(environment) {
  const declaredType = environment.VEILPASS_ASSET_TYPE?.trim().toLowerCase();
  const type = declaredType || (environment.VEILPASS_ASSET_ISSUER ? "credit" : "");
  const minimum = Number.parseFloat(environment.VEILPASS_MIN_BALANCE ?? "1");
  if (!Number.isFinite(minimum) || minimum <= 0) return false;
  if (type === "native") return !environment.VEILPASS_ASSET_CODE || environment.VEILPASS_ASSET_CODE.trim().toUpperCase() === "XLM";
  return type === "credit" && Boolean(environment.VEILPASS_ASSET_CODE?.trim()) && Boolean(environment.VEILPASS_ASSET_ISSUER?.trim());
}

const checks = [
  ["VEILPASS_HOST_ORIGIN", isOriginAllowlist(process.env.VEILPASS_HOST_ORIGIN ?? "")],
  ["VEILPASS_LOGIN_ORIGIN", isExactOrigin(process.env.VEILPASS_LOGIN_ORIGIN ?? "")],
  ["NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN", isExactOrigin(process.env.NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN ?? "")],
  ["DATABASE_URL", isPostgresUrl(process.env.DATABASE_URL ?? "")],
  ["VEILPASS_ISSUER_SECRET", Boolean(process.env.VEILPASS_ISSUER_SECRET)],
  ["VEILPASS_GATE_OWNER_SECRET", Boolean(process.env.VEILPASS_GATE_OWNER_SECRET)],
  ["NEXT_PUBLIC_VEILPASS_CONTRACT_ID", Boolean(process.env.NEXT_PUBLIC_VEILPASS_CONTRACT_ID)],
  ["NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT", Boolean(process.env.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT)],
  ["VEILPASS_ASSET_RULE", isAssetRule(process.env)],
];

const failed = checks.filter(([, valid]) => !valid).map(([name]) => name);
for (const [name, valid] of checks) process.stdout.write(`${valid ? "PASS" : "FAIL"} ${name}\n`);
if (failed.length) {
  process.stderr.write(`Runtime configuration is incomplete or malformed: ${failed.join(", ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Runtime configuration is structurally valid. Values were not printed.\n");
}
