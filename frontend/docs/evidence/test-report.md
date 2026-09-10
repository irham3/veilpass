# VeilPass MVP local verification report

Date: 2026-09-02
Verified implementation revision: `4a9147c` (`fix(proof): pass fixture public inputs to verifier`), plus the working tree changes documented with this report.

## Automated results

- ESLint: pass
- TypeScript `--noEmit`: pass
- Vitest: 17 files, 58 tests passing
- Noir membership circuit: pinned Nargo `1.0.0-beta.22` and Barretenberg `5.0.0-nightly.20260522`; valid circuit test, witness generation, UltraHonk proof generation, and verification all pass
- NoirJS runtime: `npm run proof:runtime` generated a 14,656-byte proof with 11 public inputs and verified it with the committed VK
- Soroban Rust: 3 tests passing
- Stellar Testnet smoke: current `get_gate` result returned `premium-holder`, epoch `1`, owner `GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM`, and credential root `853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc`; `is_revoked` returned `false` for the fixture hash
- Playwright desktop Chromium and mobile Chromium emulation: 26 tests passing, including distinct local App A and App B hosts
- Axe: no serious or critical violations on landing, demo, dashboard, or docs in desktop and mobile projects
- Reduced motion: pass
- Two-origin host routing: pass for `app-a.localhost:3000` and `app-b.localhost:3000`
- Five-step controlled reviewer flow: pass
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
- No PostgreSQL integration run was performed because no `DATABASE_URL` service was provided; schema and atomic adapter are included and production fails closed without it.
- No live Freighter enrollment or host-to-host sign-in was performed. Those paths require a user-controlled testnet wallet, a VPT trustline, asset funding, a configured issuer key, a production database, and the gate-owner signer for root publication.
- The currently deployed Testnet root is not a canonical BN254 field root for this membership circuit, and the configured issuer signer is not the Testnet gate owner. The gate owner must approve an initial zero-root `update_root` transaction (or supply the separately scoped `VEILPASS_GATE_OWNER_SECRET`) before live credential issuance.

## Important scope boundary

The active hosted-login integration creates a local Noir/UltraHonk proof, refreshes the durable Merkle witness, and `/api/verify` checks the committed VK. `/api/proof/simulate` remains a non-production compatibility fixture but is not accepted by `/api/verify`. The outstanding work is operational: owner-approved Testnet root initialization, durable database provisioning, independent public host deployments, live Freighter evidence, and the final review recording.
