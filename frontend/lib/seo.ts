export const siteConfig = {
  name: "VeilPass",
  url: "https://veilpass-stellar.vercel.app",
  title: "VeilPass | Private wallet login for Stellar dApps",
  description:
    "VeilPass lets Stellar dApps verify wallet eligibility and recognize returning users without receiving the user's Stellar wallet address.",
  socialTitle: "VeilPass — prove access, keep wallets private",
  socialDescription:
    "A Stellar testnet MVP for origin-scoped wallet login. Hosts receive a scoped ID and access verdict, not the wallet address.",
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
      "No. The issuer still sees the wallet during enrollment. VeilPass keeps the wallet address out of the host response and gives each origin its own private app ID.",
  },
  {
    question: "Can I deploy this from the frontend folder?",
    answer:
      "Yes. Vercel should use frontend as the project root. Keep the contract workspace at the repo root and configure production env vars in Vercel.",
  },
  {
    question: "Is the proof already zero knowledge?",
    answer:
      "The MVP ships a deterministic proof adapter labeled Simulated proof. The Noir circuit boundary is included for the future ZK path and is not misrepresented as production ZK.",
  },
  {
    question: "What does the host receive?",
    answer:
      "The host receives an eligibility verdict, gate ID, epoch, expiry, origin, and a private app ID scoped to that origin. It does not receive the Stellar wallet address.",
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
