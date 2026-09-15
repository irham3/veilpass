#!/usr/bin/env node

const loginOrigin = process.env.VEILPASS_ACCEPTANCE_LOGIN_ORIGIN ?? "https://login.veilpass.dev";
const appAOrigin = process.env.VEILPASS_ACCEPTANCE_APP_A_ORIGIN ?? "https://app-a.veilpass.dev";
const appBOrigin = process.env.VEILPASS_ACCEPTANCE_APP_B_ORIGIN ?? "https://app-b.veilpass.dev";
const gateId = "premium-holder";
const assetCode = process.env.VEILPASS_ACCEPTANCE_ASSET_CODE ?? "VPT";
const assetIssuer = process.env.VEILPASS_ACCEPTANCE_ASSET_ISSUER ?? "GDBCLMMSWLEQIZRTDBZGRQKNZYQBURTJXT6E3GFEQT7LFVC5XOOZHCGU";

function exactOrigin(value, name) {
  const parsed = new URL(value);
  if (parsed.origin !== value || parsed.protocol !== "https:") throw new Error(`${name} must be an exact HTTPS origin`);
  return parsed.origin;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function issueChallenge(origin) {
  const { response, body } = await requestJson(new URL("/api/challenges", origin), {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ gateId }),
  });
  if (response.status !== 201 || body?.origin !== origin || body?.gateId !== gateId) throw new Error(`Challenge binding failed for ${origin}`);
  return { origin: body.origin, gateId: body.gateId, expiresAt: body.expiresAt };
}

const login = exactOrigin(loginOrigin, "Login origin");
const appA = exactOrigin(appAOrigin, "App A origin");
const appB = exactOrigin(appBOrigin, "App B origin");
const home = "https://veilpass.dev";
const enrollment = new URL("/dashboard/enroll", login).toString();

const { response: healthResponse, body: health } = await requestJson(new URL("/api/health", login));
if (healthResponse.status !== 200 || health?.ok !== true) throw new Error("Hosted login health check failed");

for (const [label, origin, expectedText] of [["App A", appA, "Holder dashboard"], ["App B", appB, "Private feedback"]]) {
  const response = await fetch(origin);
  const html = await response.text();
  if (!response.ok || !html.includes(expectedText)) throw new Error(`${label} public host route failed`);
  for (const expectedLink of [enrollment, `${home}/demo`]) {
    if (!html.includes(expectedLink)) throw new Error(`${label} navigation is missing ${expectedLink}`);
  }
}

const [challengeA, challengeB] = await Promise.all([issueChallenge(appA), issueChallenge(appB)]);
if (challengeA.origin === challengeB.origin) throw new Error("Domain separation failed: origins are equal");

const rejected = await fetch(new URL("/api/challenges", appA), {
  method: "POST",
  headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
  body: JSON.stringify({ gateId }),
});
if (rejected.status !== 403) throw new Error("Untrusted origin was not rejected");

const swapQuoteUrl = new URL("https://horizon-testnet.stellar.org/paths/strict-send");
swapQuoteUrl.searchParams.set("source_asset_type", "native");
swapQuoteUrl.searchParams.set("source_amount", "1");
swapQuoteUrl.searchParams.set("destination_assets", `${assetCode}:${assetIssuer}`);
const { response: quoteResponse, body: quote } = await requestJson(swapQuoteUrl);
const quoteRecord = quote?._embedded?.records?.[0];
if (!quoteResponse.ok || !quoteRecord?.destination_amount) throw new Error("XLM to VPT Testnet quote is unavailable");

console.log(JSON.stringify({
  ok: true,
  health: true,
  publicHosts: [appA, appB],
  challenges: [challengeA, challengeB],
  untrustedOriginRejected: true,
  crossOriginNavigation: true,
  swapQuote: {
    source: "1 XLM",
    destination: `${quoteRecord.destination_amount} ${assetCode}`,
  },
}, null, 2));
