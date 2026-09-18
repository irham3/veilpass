import "server-only";

type HorizonAccount = { balances?: Array<{ asset_type?: string; asset_code?: string; asset_issuer?: string; balance?: string }> };
export type AssetRule = { type: "native"; code: "XLM"; minimum: number } | { type: "credit"; code: string; issuer: string; minimum: number };

export type TestnetEligibility = { eligible: boolean; configured: boolean; hasTrustline: boolean };

export function accountMeetsAssetRule(account: HorizonAccount, rule: AssetRule): boolean {
  return Boolean(account.balances?.some((balance) => rule.type === "native"
    ? balance.asset_type === "native" && Number.parseFloat(balance.balance ?? "0") >= rule.minimum
    : balance.asset_type !== "native" && balance.asset_code === rule.code && balance.asset_issuer === rule.issuer && Number.parseFloat(balance.balance ?? "0") >= rule.minimum));
}

export function accountHasAssetTrustline(account: HorizonAccount, rule: Pick<AssetRule, "type" | "code"> & Partial<Pick<Extract<AssetRule, { type: "credit" }>, "issuer">>): boolean {
  /* c8 ignore next -- optional chaining is a defensive nullability guard. */
  return Boolean(account.balances?.some((balance) => rule.type === "native"
    ? balance.asset_type === "native"
    : balance.asset_type !== "native" && balance.asset_code === rule.code && balance.asset_issuer === rule.issuer));
}

export function configuredAssetRule(environment: Readonly<Record<string, string | undefined>> = process.env): AssetRule | null {
  const declaredType = environment.VEILPASS_ASSET_TYPE?.trim().toLowerCase();
  const type = declaredType || (environment.VEILPASS_ASSET_ISSUER ? "credit" : "");
  const minimum = Number.parseFloat(environment.VEILPASS_MIN_BALANCE ?? "1");
  if (!Number.isFinite(minimum) || minimum <= 0) return null;
  if (type === "native") {
    // Native Stellar has no issuer or configurable asset code. Intentionally
    // ignore a stale VEILPASS_ASSET_CODE from a previous credit-asset rollout
    // when the explicit policy is native, so an environment migration cannot
    // silently make an otherwise valid XLM gate unavailable.
    return { type: "native", code: "XLM", minimum };
  }
  if (type !== "credit") return null;
  const code = environment.VEILPASS_ASSET_CODE?.trim();
  const issuer = environment.VEILPASS_ASSET_ISSUER?.trim();
  if (!code || !/^[A-Za-z0-9]{1,12}$/.test(code) || !issuer) return null;
  return { type: "credit", code, issuer, minimum };
}

export async function checkTestnetEligibility(address: string): Promise<TestnetEligibility> {
  const rule = configuredAssetRule();
  if (!rule) return { eligible: false, configured: false, hasTrustline: false };
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(address)}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return { eligible: false, configured: true, hasTrustline: false };
  const account = await response.json() as HorizonAccount;
  return { eligible: accountMeetsAssetRule(account, rule), configured: true, hasTrustline: accountHasAssetTrustline(account, rule) };
}
