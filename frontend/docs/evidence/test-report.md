# VeilPass MVP local verification report

## Current acceptance status — 2026-09-15

This section supersedes earlier dated statements in this report that describe the database, npm publication, or public App A/App B deployment.

- **Private Gate Core:** current Soroban tests pass 3/3; the Testnet smoke reads the active `premium-holder` gate at epoch `1`, and the Noir runtime creates a 14,656-byte proof with 11 public inputs that verifies against the committed key.
- **SDK and Hosted Login:** `@veilpass/shared@0.1.0`, `@veilpass/sdk@0.1.0`, and `@veilpass/server@0.1.0` are public npm packages. A clean external installation imported all three successfully with zero reported vulnerabilities.
- **Database:** Drizzle migrations `0000` through `0002` were applied to Neon; the `veilpass` schema contains all eight required durable challenge, nullifier, credential, Merkle-tree, session, and cursor tables.
- **Two public dApps:** `https://login.veilpass.dev`, `https://app-a.veilpass.dev`, and `https://app-b.veilpass.dev` are verified Vercel domains. The automated `npm run production:acceptance` check confirms hosted-login health, both host routes, distinct origin-bound challenges, and rejection of an untrusted origin.
- **Regression verification:** TypeScript, ESLint, and 62 Vitest tests pass on the current release workspace.

### Remaining manual wallet evidence

The only non-video acceptance step that cannot be executed by an agent is a user-owned Freighter action: add the Testnet VPT trustline, receive the demo asset, approve wallet access, and approve the enrollment message signature. This is intentionally non-automatable because VeilPass must not receive the wallet seed or bypass a user signature. Once the wallet owner performs those approvals, the existing App A/App B flow can demonstrate the final live private-ID, replay, expiry, and revocation evidence.

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

## Testnet owner replacement — 2026-09-14

- Previous Testnet gate owner material was unavailable, so the historical contract is superseded for live acceptance.
- Final active Testnet contract: `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`.
- Final gate owner public key: `GDVP7QVOCQ4L4CDNXVWD53ATXGYDXTDOYVFPJ3UA5OTWJW7XGXSNFXRJ`.
- Deploy transaction: `ebefe9c2aa18361e58dc1defac11fe346840d62efee2b3c4ac0c35c3544af3cb`.
- Gate initialization transaction: `c7b420f20f0167c47340259f7afb060040ac06b9f40303163ae2da8c79620558`.
- `premium-holder` starts at epoch `1` with the canonical empty Merkle root (`00` repeated 32 bytes); existing credentials from the superseded contract must be re-enrolled.

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

## Production configuration acceptance — 2026-09-14

This section supersedes the dated operational-status statements above where they describe the Testnet owner, initial root, or Vercel runtime configuration.

- Production deployment: [`DppC4sc1K3rwTsGa6RGn3ABQ39xQ`](https://vercel.com/my-team-11d97e25/veilpass/DppC4sc1K3rwTsGa6RGn3ABQ39xQ), status **Ready**, from commit `e070368`.
- Production aliases include [`https://www.veilpass.dev`](https://www.veilpass.dev) and `https://veilpass.dev`.
- `NEXT_PUBLIC_VEILPASS_CONTRACT_ID` and `NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT` were recreated as Vercel **Config** variables for Production and Preview. This is required because browser-facing `NEXT_PUBLIC_*` values must not be stored as write-only Secrets.
- `NEXT_PUBLIC_STELLAR_RPC_URL`, `NEXT_PUBLIC_STELLAR_NETWORK`, and `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` were likewise normalized to Config variables. The active single-origin login boundary is `https://www.veilpass.dev`.
- `VEILPASS_LOGIN_ORIGIN` and `VEILPASS_HOST_ORIGIN` are aligned with that exact active origin. Future App A/App B deployment must replace this single-origin boundary with the explicit final allowlist described in the runbook.
- `VEILPASS_GATE_OWNER_SECRET` is present only as a write-only Vercel Production Secret and is never committed or returned by an API.
- `GET https://www.veilpass.dev/api/health` returned HTTP `200` and `{ "ok": true }`; database, origins, contract/source identifiers, asset rule, issuer secret, and gate-owner secret all passed runtime validation.
- A deliberately invalid `POST /api/enrollment/challenge` request with `Origin: https://www.veilpass.dev` returned `PROOF_INVALID` (HTTP `400`), rather than `ORIGIN_MISMATCH`; this proves the current origin boundary accepted the request before payload validation.
