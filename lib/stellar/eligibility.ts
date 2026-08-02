import "server-only";

type HorizonAccount = { balances?: Array<{ asset_type?: string; asset_code?: string; asset_issuer?: string; balance?: string }> };
type AssetRule = { code: string; issuer: string; minimum: number };

export function accountMeetsAssetRule(account: HorizonAccount, rule: AssetRule): boolean {
  return Boolean(account.balances?.some((balance) => balance.asset_type !== "native" && balance.asset_code === rule.code && balance.asset_issuer === rule.issuer && Number.parseFloat(balance.balance ?? "0") >= rule.minimum));
}

export async function checkTestnetEligibility(address: string): Promise<{ eligible: boolean; configured: boolean }> {
  const code = process.env.VEILPASS_ASSET_CODE;
  const issuer = process.env.VEILPASS_ASSET_ISSUER;
  const minimum = Number.parseFloat(process.env.VEILPASS_MIN_BALANCE ?? "1");
  if (!code || !issuer || !Number.isFinite(minimum)) return { eligible: false, configured: false };
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(address)}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return { eligible: false, configured: true };
  return { eligible: accountMeetsAssetRule(await response.json() as HorizonAccount, { code, issuer, minimum }), configured: true };
}
