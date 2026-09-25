# VeilPass MVP local verification report

## Current verification — 2026-09-25 (supersedes older status summaries below)

The results below are from this checkout with uncommitted changes. They do not establish that the public Vercel deployment or the npm `0.1.0` packages contain these changes.

**Live Chrome finding:** Freighter access was approved on the public enrollment page. Eligibility returned HTTP 200, then enrollment stopped while initializing the browser proving engine with `Failed to fetch`. A same-origin Chrome diagnostic confirmed that the deployed CSP rejected `fetch(data:...)`; the pinned Barretenberg build loads its WASM from an embedded `data:` URL. This checkout now allows `data:` in `connect-src`. The regression failed on desktop and mobile before the fix and passed 2/2 afterward. The public domain has not received the fix, so live enrollment and subsequent acceptance remain blocked.

**Additional fixes:** the SDK now ignores duplicate proof messages while a verification request is in flight, avoiding a second one-time challenge consumption. The host UI restores an existing server cookie session after reload. The popup disables proof submission after a rejected challenge, and its privacy copy names the proof public inputs accurately. Focused SDK, host UI, and popup browser tests pass.

| Check | Result | Limit |
| --- | --- | --- |
| `npm run test:coverage` | 42 files, **172/172** tests; selected 34-module core: **100%** statements (548/548), branches (406/406), functions (120/120), lines (434/434) | This is a curated denominator, not the entire project. |
| `npm run test:coverage:all` | 42 files, **172/172** tests; 125 TypeScript/TSX/MJS production/config modules: **37.01%** statements (777/2099), **36.73%** branches (543/1478), **33.20%** functions (170/512), **36.69%** lines (633/1725) | Playwright, Rust, and Noir execution are not merged into this number. This fails a claim of full-project 100% coverage. |
| CSP WASM regression | Failed 2/2 before fix; passed 2/2 after fix (desktop and mobile) | Proves the data URL fetch boundary on the local build, not a full live credential issuance. |
| `npm run test:e2e` | **46/46** desktop Chromium and Pixel 7 scenarios, including landing/docs motion, navigation, accessibility, security, and embedded WASM fetch | Simulated reviewer bench and browser UI tests do not replace a completed public Freighter enrollment and login. |
| Browser enrollment with simulated wallet/issuer | **2/2** additional desktop/mobile scenarios; real Barretenberg WASM generated the local commitment and IndexedDB save completed | Freighter responses and issuer HTTP responses were intercepted for this test; no live signature or Testnet root transaction occurred. |
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run pack:check` | Passed after the SDK and session display fixes; four package tarballs built | Local build and packages are not yet the public release. |
| `npm run contract:test`, `npm run proof:check`, `npm run pack:check` | 3/3 Rust tests, 2/2 Noir tests and UltraHonk fixture verification, four tarball checks passed | No Rust/Noir percentage coverage and no live Freighter signature. Package `shared`, `sdk`, and `server` `0.2.0` tarballs are prepared but not published. |
| `npm audit --audit-level=moderate` | Zero reported vulnerabilities | Dependency advisories can change after this audit. |
| `npm run production:acceptance` | Passed public health, App A/B exact-origin challenges, hostile-origin rejection, navigation, and native XLM policy | Safe boundary probes only; no real login/verify/session/revoke. |
| `npm run contract:smoke` | Passed; gate `premium-holder`, epoch 1, root `273348dff2a3aea95053c4db8579ddacf1051b6d59d07516abb566e75ab4c9d2` | Read-only Testnet state. |
| Read-only configured PostgreSQL query | Merkle tree root is the same `273348…4c9d2`; 5 credential rows | Confirms this local DB configuration is internally consistent with the observed chain root. It does not prove the public deployment uses the same DB or that any credential can log in now. |

**Acceptance still required:** one recorded Freighter enrollment and actual App A twice/App B once login, a redacted host network capture, live expiry/replay/revocation checks, corresponding Testnet transaction links, review video, and proof that the public deployment and published packages match the verified commit. The [demo guide](demo-end-to-end-guide-2026-09-25.md) is the exact operator script and evidence ledger. Older sections below are historical and contain stale counts/root values.

## Current automated verification - 2026-09-19

This section supersedes older test-count and dependency-audit statements below.

- **Vitest:** 33 files and 136 tests pass across unit, component, integration, and security suites.
- **Coverage gate:** 100% statements, 100% branches, 100% functions, and 100% lines. The CI thresholds are 100/100/100/100; generated HTML and LCOV reports are retained under `frontend/coverage/`.
- **Playwright system:** 32 scenarios pass across desktop Chromium and Pixel 7 emulation. Coverage includes the two-origin flow, replay and revocation, security headers, hostile and oversized API input, session minimization, keyboard focus, responsive overflow, reduced motion, install surfaces, and axe checks.
- **Security:** Four focused Vitest security tests and six tagged Playwright security scenarios pass. `npm audit --audit-level=moderate` reports zero known vulnerabilities across production and development dependencies.
- **Build quality:** ESLint, TypeScript, all workspace package builds, and the Next.js production build pass on Next.js 16.3.5.
- **Contract:** All three Soroban Rust tests pass.
- **UI/UX review:** The landing was checked against the supplied [Apple Design Skill](https://github.com/dickwu/apple-design-skill) at desktop and mobile layouts. Navigation is a stable web-glass surface with a reduced-transparency fallback, primary viewport sections use dynamic viewport height, repetitive section labels were reduced, and the browser tests enforce focus visibility, accessibility, reduced motion, and horizontal-overflow constraints. Full findings and measured contrast values are in `docs/evidence/apple-design-review.md`.

### Fresh non-video operator checks — 2026-09-17

- `npm run production:acceptance` passed: hosted-login health, public App A/App B routes, distinct origin-bound challenges, hostile-origin rejection, and the configured native-XLM eligibility mode all passed.
- `npm run contract:smoke` passed: active gate `premium-holder`, epoch `1`, owner matches the configured signer, canonical empty root, and fixture `is_revoked=false`.
- `npm run env:validate` passed all required variable-shape checks without printing values.
- `npm run db:migrate` passed when invoked with the existing local `DATABASE_URL`; a read-only query confirmed ten `veilpass` tables and four Drizzle migration records.
- `npm run proof:check` passed circuit tests, witness generation, UltraHonk proving, and verification. `npm run pack:check` passed all four workspace tarball checks.
- Historical VPT fixture issuance completed for the supplied public holder address: transaction `905ef4093e621cb78d1229e01d6bd52c22db704ccdb47a58984e5551a514f1dd`; Horizon confirmed `1.0000000 VPT`. The active local policy now uses native XLM, so this fixture is no longer part of the reviewer path.
- Public enrollment was attempted in the Codex in-app browser after acknowledging the privacy disclosure. The browser has no Freighter extension, so the flow correctly stopped with `Freighter was not found` before any wallet signature.

> **Active policy note (2026-09-19):** native XLM is the default eligibility rule. Any older VPT/trustline/issuer commands in the historical sections below are retained as audit history only and must not be used for the current reviewer flow. For the active flow, fund the Freighter Testnet account with XLM and connect it directly.

## Current acceptance status — 2026-09-15

This section supersedes earlier dated statements in this report that describe the database, npm publication, or public App A/App B deployment.

- **Private Gate Core:** current Soroban tests pass 3/3; the Testnet smoke reads the active `premium-holder` gate at epoch `1`, and the Noir runtime creates a 14,656-byte proof with 11 public inputs that verifies against the committed key.
- **SDK and Hosted Login:** `@veilpass/shared@0.1.0`, `@veilpass/sdk@0.1.0`, and `@veilpass/server@0.1.0` are public npm packages. A clean external installation imported all three successfully with zero reported vulnerabilities.
- **Database:** Drizzle migrations `0000` through `0002` were applied to Neon; the `veilpass` schema contains all eight required durable challenge, nullifier, credential, Merkle-tree, session, and cursor tables.
- **Two public dApps:** `https://login.veilpass.dev`, `https://app-a.veilpass.dev`, and `https://app-b.veilpass.dev` are verified Vercel domains. The automated `npm run production:acceptance` check confirms hosted-login health, both host routes, distinct origin-bound challenges, and rejection of an untrusted origin.
- **Regression verification:** TypeScript, ESLint, and 62 Vitest tests pass on the current release workspace.

### Remaining manual wallet evidence

The only non-video acceptance step that cannot be executed by an agent is a user-owned Freighter action: fund the Testnet wallet with the configured native XLM minimum, approve wallet access, and approve the enrollment message signature. This is intentionally non-automatable because VeilPass must not receive the wallet seed or bypass a user signature. Once the wallet owner performs those approvals, the existing App A/App B flow can demonstrate the final live private-ID, replay, expiry, and revocation evidence.

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

## Historical setup notes (superseded where contradicted by the current sections above)

- Freighter wallet trustline and holder funding were not performed because they require the user's Testnet wallet public key and wallet approval. Run `npm run asset:issue -- <FREIGHTER_TESTNET_PUBLIC_KEY>` after adding the generated `VPT` asset in Freighter.
- Earlier local verification did not have a database connection. The current operator check above loads the configured `DATABASE_URL` and applies the migrations successfully; a live restart/concurrency acceptance trace is still not recorded.
- No live Freighter enrollment or host-to-host sign-in was performed. Those paths require a user-controlled testnet wallet, a VPT trustline, asset funding, a configured issuer key, a production database, and the gate-owner signer for root publication.
- The active Testnet gate now reports the canonical empty root and the configured owner matches the on-chain owner. A non-empty root still requires a real wallet enrollment and owner-controlled root publication.

## Important scope boundary

The active hosted-login integration creates a local Noir/UltraHonk proof, refreshes the durable Merkle witness, and `/api/verify` checks the committed VK. `/api/proof/simulate` remains a non-production compatibility fixture but is not accepted by `/api/verify`. The only outstanding product acceptance is a wallet-owner-approved enrollment followed by live root publication, replay/expiry/revocation evidence, and the final review recording.

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
