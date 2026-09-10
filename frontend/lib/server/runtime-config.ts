import "server-only";

export type RuntimeConfigIssue =
  | "DATABASE_URL_INVALID"
  | "HOST_ORIGIN_INVALID"
  | "LOGIN_ORIGIN_INVALID"
  | "PUBLIC_LOGIN_ORIGIN_INVALID"
  | "CONTRACT_ID_MISSING"
  | "SOURCE_ACCOUNT_MISSING"
  | "GATE_IDS_MISSING"
  | "ASSET_RULE_INCOMPLETE"
  | "ISSUER_SECRET_MISSING"
  | "GATE_OWNER_SECRET_MISSING";

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

function isPostgresUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:") && Boolean(url.hostname) && Boolean(url.pathname && url.pathname !== "/") && Boolean(url.username);
  } catch {
    return false;
  }
}

/**
 * Returns only boolean readiness information and stable issue codes. It never
 * returns environment values, URLs, keys, or wallet addresses.
 */
export function inspectRuntimeConfiguration(environment: RuntimeEnvironment = process.env): RuntimeConfigReport {
  const checks = {
    database: isPostgresUrl(environment.DATABASE_URL),
    hostOrigin: isExactOrigin(environment.VEILPASS_HOST_ORIGIN),
    loginOrigin: isExactOrigin(environment.VEILPASS_LOGIN_ORIGIN),
    publicLoginOrigin: isExactOrigin(environment.NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN),
    contractId: Boolean(environment.NEXT_PUBLIC_VEILPASS_CONTRACT_ID),
    sourceAccount: Boolean(environment.NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT),
    gateIds: Boolean(environment.VEILPASS_GATE_IDS?.split(",").map((value) => value.trim()).filter(Boolean).length),
    assetRule: Boolean(environment.VEILPASS_ASSET_CODE && environment.VEILPASS_ASSET_ISSUER && environment.VEILPASS_MIN_BALANCE),
    issuerSecret: Boolean(environment.VEILPASS_ISSUER_SECRET),
    gateOwnerSecret: Boolean(environment.VEILPASS_GATE_OWNER_SECRET),
  };
  const issues: RuntimeConfigIssue[] = [];
  if (!checks.database) issues.push("DATABASE_URL_INVALID");
  if (!checks.hostOrigin) issues.push("HOST_ORIGIN_INVALID");
  if (!checks.loginOrigin) issues.push("LOGIN_ORIGIN_INVALID");
  if (!checks.publicLoginOrigin) issues.push("PUBLIC_LOGIN_ORIGIN_INVALID");
  if (!checks.contractId) issues.push("CONTRACT_ID_MISSING");
  if (!checks.sourceAccount) issues.push("SOURCE_ACCOUNT_MISSING");
  if (!checks.gateIds) issues.push("GATE_IDS_MISSING");
  if (!checks.assetRule) issues.push("ASSET_RULE_INCOMPLETE");
  if (!checks.issuerSecret) issues.push("ISSUER_SECRET_MISSING");
  if (!checks.gateOwnerSecret) issues.push("GATE_OWNER_SECRET_MISSING");
  return { ok: issues.length === 0, issues, checks };
}
