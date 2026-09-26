import "server-only";

import { StrKey } from "@stellar/stellar-sdk";

export type RuntimeConfigIssue =
  | "DATABASE_URL_INVALID"
  | "HOST_ORIGIN_INVALID"
  | "LOGIN_ORIGIN_INVALID"
  | "PUBLIC_LOGIN_ORIGIN_INVALID"
  | "CONTRACT_ID_INVALID"
  | "SOURCE_ACCOUNT_INVALID"
  | "GATE_IDS_MISSING"
  | "ASSET_RULE_INCOMPLETE"
  | "ISSUER_SECRET_INVALID"
  | "GATE_OWNER_SECRET_INVALID";

export type RuntimeConfigReport = {
  ok: boolean;
  issues: RuntimeConfigIssue[];
  checks: Record<string, boolean>;
};

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

function isExactOrigin(value: string | undefined): boolean {
  if (!value) return false;
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

function isOriginAllowlist(value: string | undefined): boolean {
  if (!value) return false;
  const configuredOrigins = value.split(",");
  const origins = configuredOrigins.map((origin) => origin.trim()).filter(Boolean);
  return origins.length > 0 && origins.length === configuredOrigins.length && origins.every(isExactOrigin) && new Set(origins).size === origins.length;
}

function isPostgresUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:") && Boolean(url.hostname) && Boolean(url.pathname && url.pathname !== "/") && Boolean(url.username);
  } catch {
    return false;
  }
}

function hasValidAssetRule(environment: RuntimeEnvironment): boolean {
  const declaredType = environment.VEILPASS_ASSET_TYPE?.trim().toLowerCase();
  const type = declaredType || (environment.VEILPASS_ASSET_ISSUER ? "credit" : "");
  const minimum = Number.parseFloat(environment.VEILPASS_MIN_BALANCE ?? "1");
  if (!Number.isFinite(minimum) || minimum <= 0) return false;
  // An explicit native policy is XLM by definition. Do not let an obsolete
  // credit-asset code left in a deployment environment make health fail.
  if (type === "native") return true;
  return type === "credit" && Boolean(environment.VEILPASS_ASSET_CODE?.trim()) && Boolean(environment.VEILPASS_ASSET_ISSUER?.trim());
}

/**
 * Returns only boolean readiness information and stable issue codes. It never
 * returns environment values, URLs, keys, or wallet addresses.
 */
export function inspectRuntimeConfiguration(environment: RuntimeEnvironment = process.env): RuntimeConfigReport {
  const checks = {
    database: isPostgresUrl(environment.DATABASE_URL),
    hostOrigin: isOriginAllowlist(environment.VEILPASS_HOST_ORIGIN),
    loginOrigin: isExactOrigin(environment.VEILPASS_LOGIN_ORIGIN),
    publicLoginOrigin: isExactOrigin(environment.NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN),
    contractId: StrKey.isValidContract(environment.NEXT_PUBLIC_VEILPASS_CONTRACT_ID ?? ""),
    sourceAccount: StrKey.isValidEd25519PublicKey(environment.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT ?? ""),
    gateIds: Boolean(environment.VEILPASS_GATE_IDS?.split(",").map((value) => value.trim()).filter(Boolean).length),
    assetRule: hasValidAssetRule(environment),
    issuerSecret: StrKey.isValidEd25519SecretSeed(environment.VEILPASS_ISSUER_SECRET ?? ""),
    gateOwnerSecret: StrKey.isValidEd25519SecretSeed(environment.VEILPASS_GATE_OWNER_SECRET ?? ""),
  };
  const issues: RuntimeConfigIssue[] = [];
  if (!checks.database) issues.push("DATABASE_URL_INVALID");
  if (!checks.hostOrigin) issues.push("HOST_ORIGIN_INVALID");
  if (!checks.loginOrigin) issues.push("LOGIN_ORIGIN_INVALID");
  if (!checks.publicLoginOrigin) issues.push("PUBLIC_LOGIN_ORIGIN_INVALID");
  if (!checks.contractId) issues.push("CONTRACT_ID_INVALID");
  if (!checks.sourceAccount) issues.push("SOURCE_ACCOUNT_INVALID");
  if (!checks.gateIds) issues.push("GATE_IDS_MISSING");
  if (!checks.assetRule) issues.push("ASSET_RULE_INCOMPLETE");
  if (!checks.issuerSecret) issues.push("ISSUER_SECRET_INVALID");
  if (!checks.gateOwnerSecret) issues.push("GATE_OWNER_SECRET_INVALID");
  return { ok: issues.length === 0, issues, checks };
}
