import "server-only";

type HorizonAccount = { balances?: Array<{ asset_type?: string; asset_code?: string; asset_issuer?: string; balance?: string }> };
type AssetRule = { code: string; issuer: string; minimum: number };

export type TestnetEligibility = { eligible: boolean; configured: boolean; hasTrustline: boolean };

export function accountMeetsAssetRule(account: HorizonAccount, rule: AssetRule): boolean {
  return Boolean(account.balances?.some((balance) => balance.asset_type !== "native" && balance.asset_code === rule.code && balance.asset_issuer === rule.issuer && Number.parseFloat(balance.balance ?? "0") >= rule.minimum));
}

export function accountHasAssetTrustline(account: HorizonAccount, rule: Pick<AssetRule, "code" | "issuer">): boolean {
  return Boolean(account.balances?.some((balance) => balance.asset_type !== "native" && balance.asset_code === rule.code && balance.asset_issuer === rule.issuer));
}

export async function checkTestnetEligibility(address: string): Promise<TestnetEligibility> {
  const code = process.env.VEILPASS_ASSET_CODE;
  const issuer = process.env.VEILPASS_ASSET_ISSUER;
  const minimum = Number.parseFloat(process.env.VEILPASS_MIN_BALANCE ?? "1");
  if (!code || !issuer || !Number.isFinite(minimum) || minimum <= 0) return { eligible: false, configured: false, hasTrustline: false };
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(address)}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return { eligible: false, configured: true, hasTrustline: false };
  const account = await response.json() as HorizonAccount;
  const rule = { code, issuer, minimum };
  return { eligible: accountMeetsAssetRule(account, rule), configured: true, hasTrustline: accountHasAssetTrustline(account, rule) };
}
