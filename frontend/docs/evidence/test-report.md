# VeilPass MVP local verification report

Date: 2026-08-02
Verified implementation revision: frontend workspace after moving the Next.js app to `frontend/`

## Automated results

- ESLint: pass
- TypeScript `--noEmit`: pass
- Vitest: 14 files, 52 tests passing
- Soroban Rust: 3 tests passing
- Stellar Testnet smoke: `get_gate` returned `premium-holder` epoch 1 and credential root `853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc`; `is_revoked` returned false for the fixture hash
- Playwright desktop Chromium: 11 tests passing
- Playwright mobile Chromium emulation: 11 tests passing
- Axe: no serious or critical violations on landing, demo, dashboard, or docs in desktop and mobile projects
- Reduced motion: pass
- Five-step reviewer flow: pass
- Known-wallet exclusion across rendered text, Web Storage, cookies, console, and API bodies: pass
- Browser/install surfaces: `/icon.svg`, generated Apple icon, and `manifest.webmanifest` are VeilPass-owned; default Next template assets return 404
- Production Next.js build: pass
- Runtime dependency audit: 0 vulnerabilities
- Secret-pattern scan: no committed Stellar secret seed found; generated `.env.local` remains git-ignored

## Workspace structure

- Next.js frontend root: `frontend/`
- Stellar contract root: `contracts/veilpass-gate`
- Local frontend env: `frontend/.env.local` (ignored)
- Vercel project root setting: `frontend`

## Dependency note

The full development audit reports four moderate findings in Drizzle Kit's development-only legacy esbuild loader. `npm audit --omit=dev` is clean. npm proposes an unsafe Drizzle Kit downgrade, so it was not applied.

## Visual evidence

- `landing-desktop.png`
- `demo-desktop.png`

## External setup not performed

- Freighter wallet trustline and holder funding were not performed because they require the user's Testnet wallet public key and wallet approval. Run `npm run asset:issue -- <FREIGHTER_TESTNET_PUBLIC_KEY>` after adding the generated `VPT` asset in Freighter.
- The Noir circuit was not compiled because the official Noir/Barretenberg toolchain requires WSL on Windows and is not installed here.
- No PostgreSQL integration run was performed because no `DATABASE_URL` service was provided; schema and atomic adapter are included and production fails closed without it.

These are environment/credential setup items. The deterministic proof path remains visibly labeled `Simulated proof` and is not represented as zero knowledge.
