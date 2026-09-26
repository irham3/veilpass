export const siteConfig = {
  name: "VeilPass",
  url: "https://veilpass.dev",
  title: "VeilPass | Private wallet login for Stellar dApps",
  description:
    "VeilPass lets Stellar dApps verify wallet eligibility without receiving the user's Stellar wallet address. The host verifier receives proof inputs transiently; this Testnet MVP is not an anonymity system.",
  socialTitle: "VeilPass: prove access, keep wallets private",
  socialDescription:
      "A Stellar Testnet MVP for origin-scoped wallet login. Hosts receive a scoped ID and access verdict, not the wallet address; host servers process sensitive proof inputs during verification.",
  ogImageAlt:
    "VeilPass private aperture showing an eligibility verdict without exposing a Stellar wallet address.",
} as const;

export const seoKeywords = [
  "VeilPass",
  "Stellar wallet login",
  "private wallet login",
  "Stellar testnet dApp",
  "wallet eligibility verification",
  "origin scoped identity",
  "Freighter wallet",
  "Soroban gate registry",
] as const;

export const landingFaqItems = [
  {
    question: "Does VeilPass make the user anonymous?",
    answer:
      "No. The issuer sees the wallet during enrollment. The host verification API receives proof bytes and public inputs, which are sensitive and must not be logged, but the login result excludes the Stellar wallet address. VeilPass gives each allowed origin its own scoped private app ID and does not hide IP, timing, browser fingerprint, or later on-chain activity.",
  },
  {
    question: "Can I deploy this from the frontend folder?",
    answer:
      "Set Vercel's Root Directory to frontend and keep the contract workspace in the repository. Run the Vercel CLI from the repository root because the linked project already applies the frontend root setting. Configure production environment values in Vercel; do not commit them.",
  },
  {
    question: "Is the proof already zero knowledge?",
    answer:
      "Hosted login generates a local Noir/UltraHonk membership proof and the server verifies it with a pinned verification key. The separately labeled Simulated proof route is a non-production compatibility fixture and is never accepted by the verifier.",
  },
  {
    question: "What does the host receive?",
    answer:
      "The successful result contains an eligibility verdict, gate ID, epoch, expiry, origin, and a private app ID scoped to that origin. The host's POST /api/verify endpoint also receives the raw proof and public inputs transiently; do not log or persist that request. Neither contains the Stellar wallet address.",
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
