# VeilPass MVP local verification report

## Current verification — 2026-09-26 (supersedes older status summaries below)

The results below are from this checkout with uncommitted changes. Production deployment `dpl_D5pR6QWm7Ci1LWLCeN3y2W7MmmJe` is READY. It includes the corrected browser-visible host origin, exact Barretenberg CRS CSP hosts, a writable `/tmp` CRS cache for Vercel verification, a 60-second `/api/verify` budget, and five-minute proof-clock skew bounded by server-issued challenge expiry. `@veilpass/shared@0.2.0`, `@veilpass/sdk@0.2.0`, and `@veilpass/server@0.2.0` were published publicly on 26 September 2026 using local npm publish without provenance. Their clean install/import and tarball integrity checks passed earlier. npm metadata points `gitHead` at `f2a6de552698c5627c3bcede2890d4e8d17bdaca`, while this checkout contains uncommitted changes, so a reviewed source commit/GitHub release and provenance-backed package release are still outstanding. The npm website still renders the previously published `0.2.0` README; the expanded package READMEs and homepage metadata in this checkout require a new protected release before the npm pages can match this source.

**Live Chrome and production acceptance:** the user completed Testnet enrollment and the hosted page showed “Credential stored in this browser”. The first login exposed two production defects: the host UI rendered a localhost SSR fallback, and the verifier could not initialize the CRS cache in a read-only serverless home directory. Both fixes are deployed. Using the browser-local credential, App A login succeeded twice with the same private app ID; App B succeeded once with a different ID. The hosts reported authenticated sessions and production `/api/verify` returned HTTP 200. Private IDs and proof values were not copied into this report. The earlier enrollment reference `af2f4b9d-34f5-47a8-b371-84c8b894ed10` traced to an invalid contract StrKey and root mismatch; Production and Preview use active Testnet contract `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`.

**Additional fixes:** the SDK now ignores duplicate proof messages while a verification request is in flight, avoiding a second one-time challenge consumption. The host UI restores an existing server cookie session after reload. The popup disables proof submission after a rejected challenge, and its privacy copy names the proof public inputs accurately. Focused SDK, host UI, and popup browser tests pass.

| Check | Result | Limit |
| --- | --- | --- |
| `npm run test:coverage` | **279/279 tests**; curated core: **100%** statements (580/580), branches (424/424), functions (123/123), and lines (479/479) | Curated core denominator, not whole-project coverage. |
| `npm run test:coverage:all` | **87 files, 279/279 tests**; 106 executable first-party TypeScript/TSX/MJS modules: **77.16%** statements (1625/2106), **75.14%** branches (1143/1521), **79.10%** functions (337/426), **79.51%** lines (1390/1748) | Every executable module has statement coverage; unexecuted statements and branches remain. Type-only declarations and declarative/re-export surfaces are checked through typecheck or focused export/config tests. Browser, Rust, and Noir execution use separate denominators. |
| `npm run docs:check` | **3/3 checks passed**: all implemented API paths/methods appear in web/GitHub references; privacy copy covers request proof sensitivity; npm root READMEs contain package-specific scopes and declared exports. | A sync regression test, not proof that remote GitHub/npm/Vercel content has already been updated. |
| CSP WASM regression | Failed 2/2 before fix; passed 2/2 after fix (desktop and mobile) | Proves the data URL fetch boundary on the local build, not a full live credential issuance. |
| `npm run test:e2e -- --workers=2` | **48/48** desktop Chromium and Pixel 7 scenarios passed on 26 September | Includes landing/docs motion, navigation and external package links, accessibility, security, embedded WASM fetch, and browser enrollment with a simulated wallet/issuer. No live signature or Testnet root transaction occurred in this automated run. |
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run pack:check` | Passed; all four workspace tarballs built and checked. Public npm `0.2.0` tarballs for shared/sdk/server install and import successfully, with matching integrity hashes. | Manual npm publish used `--provenance=false`; the repository has no reviewed source commit/GitHub Release matching this working tree yet. |
| `npm run contract:test`, `npm run proof:check`, `npm run pack:check` | 3/3 Rust tests, 2/2 Noir tests and UltraHonk fixture verification, four tarball checks passed | Rust/Noir percentage coverage is not part of the TypeScript full-inventory metric. The shared, SDK, and server `0.2.0` packages were published manually without provenance; see release caveat above. |
| `npm audit --audit-level=moderate` | Zero reported vulnerabilities | Dependency advisories can change after this audit. |
| `npm run production:acceptance` | Passed after deployment `dpl_D5pR6QWm7Ci1LWLCeN3y2W7MmmJe`: health, App A/B exact-origin challenges, hostile-origin rejection, navigation, and native XLM policy | Automated acceptance does not exercise Freighter; the live enrollment and login were separately completed as described above. |
| Package README/artifact refresh | `npm run pack:check` passes for prepared `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server` `0.2.1`, plus contract-bindings `0.1.0` | These `0.2.1` tarballs and README metadata are local release candidates. The public npm pages remain at `0.2.0` until a reviewed merge and protected `v0.2.1` tag workflow. |
| `npm run contract:smoke` | Passed; gate `premium-holder`, epoch 1, latest recorded root `011886fe9e4b0870451e95aee95ff0bad35f2a8dd86444b306b27cd4ee98834c` | Read-only Testnet state after enrollment. Recheck the root before a new live demonstration because it can change after issuance. |
| Live production witness refresh and proof verification | Both succeeded using the enrolled Testnet credential; host `/api/verify` returned HTTP 200 | Confirms the deployed verifier accepted the credential against production state. Do not treat this as a replacement for a fresh DB-to-chain root audit or for replay/expiry/revocation acceptance. |

### Full-inventory coverage detail

`test:coverage:all` instruments 106 executable first-party TypeScript, TSX, and MJS modules; no executable module is left with zero statement hits. Five files with no runtime implementation statements (type-only declarations, declarative Drizzle configuration, and re-export barrels) are covered by TypeScript, configuration assertions, or public-entry-point tests instead. Rust, Noir circuit execution, and Playwright remain separate coverage denominators. Current full-inventory results are **77.16% statements (1625/2106), 75.14% branches (1143/1521), 79.10% functions (337/426), and 79.51% lines (1390/1748)**; meaningful code paths and conditions remain untested, so the workspace does not have 100% full-project coverage.

Direct tests were added for enrollment consent, wallet/network/account mismatch handling, IndexedDB credential validation and recovery, landing/docs content and metadata, enrollment/dashboard/login/host pages, UI primitives and transitions, demo asset route reservations and ambiguous payment handling, proof simulation gating, worker messages, generated Soroban error bindings, database schema names, credential logging redaction, safe CLI paths, and cross-surface docs/API/package export consistency. The dashboard now displays the live gate owner alongside the contract state. Expected proof rejection logs contain only a request ID and typed reason; challenge IDs, digests, origins, and credential roots are not logged. **Full-inventory statement coverage is 77.16%, not 100%.**

**Preflight and recovery regression:** direct route tests prove that enrollment accepts only an allowed gate and exact login origin; invalid addresses/gates fail; eligibility network errors now return `SERVICE_UNAVAILABLE` (503) instead of misreporting the wallet as ineligible (403). The popup offers a tested re-enrollment action when a local credential has no active witness.

**Acceptance still required:** live replay, expiry, and revocation checks; a redacted host network capture; review video; a reviewed source commit/GitHub Release matching the deployment and package tarballs; and a protected patch release so the expanded README appears on npm. Full-project coverage is not 100%: the current all-inventory report shows 77.16% statements and 75.14% branches even though every executable module has statement coverage. The [demo guide](demo-end-to-end-guide-2026-09-25.md) is the operator script and evidence ledger. Older sections below are historical and contain stale counts/root values.

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
