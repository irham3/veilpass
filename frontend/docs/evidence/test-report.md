# VeilPass MVP local verification report

## Current verification — 2026-09-29 (supersedes older status summaries below)

The latest code and dependency verification is GitHub `master` commit `501f522`; [CI run 36512137059](https://github.com/irham3/veilpass/actions/runs/36512137059) passed both quality/build and browser/accessibility jobs, including dependency audit, coverage inventory, contract tests, package checks, and production build. The historical status summaries below do not describe current release readiness.

The production deployment described in this historical verification passed its production checks. Production deployment `dpl_D5pR6QWm7Ci1LWLCeN3y2W7MmmJe` was READY during live enrollment/login verification; the merged docs return HTTP 200 from production docs routes. The deployment includes the corrected browser-visible host origin, exact Barretenberg CRS CSP hosts, a writable `/tmp` CRS cache for Vercel verification, a 60-second `/api/verify` budget, and bounded proof-clock skew. On 27 September, [release workflow `v0.2.1` attempt 2](https://github.com/irham3/veilpass/actions/runs/36215791259/attempts/2) succeeded after the npm owner authorized Trusted Publisher publishing. Public `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server` now have version `0.2.1`, npm provenance, and `gitHead` matching the release tag `3edf8974df9656a44a4361868b33dd3794d19ad1`. The [GitHub Release](https://github.com/irham3/veilpass/releases/tag/v0.2.1) includes all three package archives and `SHA256SUMS`; clean install/import and archive checksums passed. See the [release verification](release-v0.2.1-verification-2026-09-27.md).

**Live Chrome and production acceptance:** the user completed Testnet enrollment and the hosted page showed “Credential stored in this browser”. The first login exposed two production defects: the host UI rendered a localhost SSR fallback, and the verifier could not initialize the CRS cache in a read-only serverless home directory. Both fixes are deployed. Using the browser-local credential, App A login succeeded twice with the same private app ID; App B succeeded once with a different ID. The hosts reported authenticated sessions and production `/api/verify` returned HTTP 200. Private IDs and proof values were not copied into this report. The earlier enrollment reference `af2f4b9d-34f5-47a8-b371-84c8b894ed10` traced to an invalid contract StrKey and root mismatch; Production and Preview use active Testnet contract `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`.

**Additional fixes:** the SDK now ignores duplicate proof messages while a verification request is in flight, avoiding a second one-time challenge consumption. The host UI restores an existing server cookie session after reload. The popup disables proof submission after a rejected challenge, and its privacy copy names the proof public inputs accurately. Focused SDK, host UI, and popup browser tests pass.

**Live negative acceptance — 2026-09-29:** using the newly enrolled disposable Testnet credential, a successful App A login returned HTTP 200. Reposting its consumed proof returned HTTP 400 `CHALLENGE_SPENT`. A separate, unused proof submitted after the server-side expiry returned HTTP 400 `CREDENTIAL_EXPIRED`. The gate owner signer was verified against the live contract before submitting a revocation; [the Testnet transaction](https://stellar.expert/explorer/testnet/tx/c3e8eb3855eeca0b99cd9912f020a668ef516a67313edf1459fe4620200cf261) was confirmed by a subsequent `is_revoked=true` read. A new App A login then displayed `CREDENTIAL_REVOKED`. Proofs, private IDs, wallet address, revocation hash, and signer material are omitted. During the run, the local browser clock was ahead of the HTTP server `Date` header and there were transient network timeouts; early attempts were excluded, and the expiry result was recorded only after the server clock had passed the proof expiry.

| Check | Result | Limit |
| --- | --- | --- |
| `npm run test:coverage` | **322/322 tests**; curated core: **100%** statements (580/580), branches (424/424), functions (123/123), and lines (479/479) | Curated core denominator, not whole-project coverage. |
| `npm run test:coverage:all` | **91 files, 322/322 tests**; **107 executable first-party modules**: **88.35%** statements (1882/2130), **84.17%** branches (1293/1536), **87.35%** functions (380/435), **91.17%** lines (1611/1767). The CI gate requires a statement hit in every executable module. | Every executable module is exercised, but aggregate statements/branches/lines are not 100%. Type-only declarations and declarative/re-export surfaces use typecheck or focused export/config tests. Browser, Rust, and Noir circuit execution use separate denominators. |
| `npm run docs:check` | **3/3 checks passed**: all implemented API paths/methods appear in web/GitHub references; privacy copy covers request proof sensitivity; npm root READMEs contain package-specific scopes and declared exports. | A sync regression test, not proof that remote GitHub/npm/Vercel content has already been updated. |
| CSP WASM regression | Failed 2/2 before fix; passed 2/2 after fix (desktop and mobile) | Proves the data URL fetch boundary on the local build, not a full live credential issuance. |
| `npm run test:e2e -- --workers=2` | **48/48** desktop Chromium and Pixel 7 scenarios passed on 26 September | Includes landing/docs motion, navigation and external package links, accessibility, security, embedded WASM fetch, and browser enrollment with a simulated wallet/issuer. No live signature or Testnet root transaction occurred in this automated run. |
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run pack:check` | Passed; all four workspace tarballs built and checked. Public npm `0.2.1` tarballs for shared/sdk/server installed cleanly and imported through CJS and ESM; registry metadata contains provenance attestations. | The released packages come from tag `v0.2.1`; later `master` commits add tests/evidence documentation. |
| `npm run contract:test`, `npm run proof:check`, `npm run pack:check` | 3/3 Rust tests, 2/2 Noir tests and UltraHonk fixture verification, four tarball checks passed | Rust/Noir percentage coverage is not part of the TypeScript full-inventory metric. |
| `npm audit --audit-level=moderate` | Zero reported vulnerabilities | Dependency advisories can change after this audit. |
| `npm run production:acceptance` | Passed after deployment `dpl_D5pR6QWm7Ci1LWLCeN3y2W7MmmJe`: health, App A/B exact-origin challenges, hostile-origin rejection, navigation, and native XLM policy | Automated acceptance does not exercise Freighter; the live enrollment and login were separately completed as described above. |
| Package README/artifact refresh | `pack:check` passed for shared/sdk/server `0.2.1` and contract-bindings `0.1.0`. All three public npm packages are at `0.2.1` with README and provenance; GitHub Release archives and SHA256 checksums verified. | Public package import smoke passed; root transaction evidence and review video remain. |
| `npm run contract:smoke` | Passed on 29 September; gate `premium-holder`, epoch 1, root `2599dffae45935bcfafde7039c4ebc1bf2bffb22b24b4089deedcccf2c9e2770`; owner matched configured signer | Read-only Testnet state after enrollment. Recheck the root before a new live demonstration because it can change after issuance. |
| Live production witness refresh and proof verification | Both succeeded using the enrolled Testnet credential; host `/api/verify` returned HTTP 200 | Confirms the deployed verifier accepted the credential against production state. Negative live cases are recorded separately above. |

### Full-inventory coverage detail

`test:coverage:all` instruments 107 executable first-party TypeScript, TSX, and MJS modules and runs `scripts/check-full-coverage.mjs`; CI fails if any executable module has zero statement hits. Five no-runtime surfaces (type-only declarations, declarative Drizzle configuration, and re-export barrels) use TypeScript, configuration assertions, or public-entry-point tests instead. Rust, Noir circuit execution, and Playwright remain separate coverage denominators. Current full-inventory results are **88.35% statements (1882/2130), 84.17% branches (1293/1536), 87.35% functions (380/435), and 91.17% lines (1611/1767)**. All executable modules are exercised, but uncovered statements and conditions remain, so aggregate full-project coverage is not 100%.

Direct tests now cover enrollment consent and completion, wallet/network/account mismatch handling, IndexedDB credential validation and recovery, landing/docs content and metadata, enrollment/dashboard/login/host pages, UI primitives and transitions, demo asset route reservations and ambiguous payment handling, proof simulation policy branches, Noir prove/cache/backend/error paths, worker messages, generated Soroban error bindings, database schema names, credential logging redaction, Testnet asset/liquidity CLI paths, full-source coverage enforcement, and cross-surface docs/API/package export consistency. The dashboard displays the live gate owner alongside the contract state. Expected proof rejection logs contain only a request ID and typed reason; challenge IDs, digests, origins, and credential roots are not logged. Full-inventory coverage is 88.35% statements; every executable module has at least one test-hit statement.

**Preflight and recovery regression:** direct route tests prove that enrollment accepts only an allowed gate and exact login origin; invalid addresses/gates fail; eligibility network errors now return `SERVICE_UNAVAILABLE` (503) instead of misreporting the wallet as ineligible (403). The popup offers a tested re-enrollment action when a local credential has no active witness.

**Acceptance still required:** the review video. The [Testnet root publication transaction](https://stellar.expert/explorer/testnet/tx/ab2cb1f74c9595f03a4cda4b63299720f467d602db22cd2819bebaec82ea526c) emitted `root_updated` for `premium-holder`; its decoded event confirmed epoch `1` and root `2599dffae45935bcfafde7039c4ebc1bf2bffb22b24b4089deedcccf2c9e2770`. Live replay, expiry, revocation, and a redacted host request/response summary passed on 29 September; see [the host capture](host-network-capture-redacted-2026-09-29.md) and [demo guide](demo-end-to-end-guide-2026-09-25.md). Aggregate coverage is not 100%: 88.35% statements, 84.17% branches, 87.35% functions, and 91.17% lines, though all 107 executable modules have statement hits and the curated core remains 100%. Older sections below are historical and contain stale counts/root values.

## Historical automated verification — 2026-09-19

These results are a dated snapshot and are superseded by the current verification at the beginning of this report.

- **Vitest:** 33 files and 136 tests pass across unit, component, integration, and security suites.
- **Coverage gate:** 100% statements, 100% branches, 100% functions, and 100% lines. The CI thresholds are 100/100/100/100; generated HTML and LCOV reports are retained under `frontend/coverage/`.
- **Playwright system:** 32 scenarios pass across desktop Chromium and Pixel 7 emulation. Coverage includes the two-origin flow, replay and revocation, security headers, hostile and oversized API input, session minimization, keyboard focus, responsive overflow, reduced motion, install surfaces, and axe checks.
- **Security:** Four focused Vitest security tests and six tagged Playwright security scenarios pass. `npm audit --audit-level=moderate` reports zero known vulnerabilities across production and development dependencies.
- **Build quality:** ESLint, TypeScript, all workspace package builds, and the Next.js production build pass on Next.js 16.3.5.
- **Contract:** All three Soroban Rust tests pass.
- **UI/UX review:** The landing was checked against the supplied [Apple Design Skill](https://github.com/dickwu/apple-design-skill) at desktop and mobile layouts. Navigation is a stable web-glass surface with a reduced-transparency fallback, primary viewport sections use dynamic viewport height, repetitive section labels were reduced, and the browser tests enforce focus visibility, accessibility, reduced motion, and horizontal-overflow constraints. Full findings and measured contrast values are in `docs/evidence/apple-design-review.md`.

### Historical non-video operator checks — 2026-09-17

These checks describe the state at that time. In particular, the empty root and lack of Freighter support in the Codex in-app browser were superseded by enrollment and live Testnet verification on 2026-09-29.

- `npm run production:acceptance` passed: hosted-login health, public App A/App B routes, distinct origin-bound challenges, hostile-origin rejection, and the configured native-XLM eligibility mode all passed.
- `npm run contract:smoke` passed: active gate `premium-holder`, epoch `1`, owner matches the configured signer, canonical empty root, and fixture `is_revoked=false`.
- `npm run env:validate` passed all required variable-shape checks without printing values.
- `npm run db:migrate` passed when invoked with the existing local `DATABASE_URL`; a read-only query confirmed ten `veilpass` tables and four Drizzle migration records.
- `npm run proof:check` passed circuit tests, witness generation, UltraHonk proving, and verification. `npm run pack:check` passed all four workspace tarball checks.
- Historical VPT fixture issuance completed for the supplied public holder address: transaction `905ef4093e621cb78d1229e01d6bd52c22db704ccdb47a58984e5551a514f1dd`; Horizon confirmed `1.0000000 VPT`. The active local policy now uses native XLM, so this fixture is no longer part of the reviewer path.
- Public enrollment was attempted in the Codex in-app browser after acknowledging the privacy disclosure. The browser has no Freighter extension, so the flow correctly stopped with `Freighter was not found` before any wallet signature.

> **Active policy note (2026-09-19):** native XLM is the default eligibility rule. Any older VPT/trustline/issuer commands in the historical sections below are retained as audit history only and must not be used for the current reviewer flow. For the active flow, fund the Freighter Testnet account with XLM and connect it directly.

## Historical acceptance snapshot — 2026-09-15

This dated snapshot is retained for traceability. Current acceptance is recorded at the start of this report and in the 2026-09-29 live acceptance checklist.

- **Private Gate Core:** current Soroban tests pass 3/3; the Testnet smoke reads the active `premium-holder` gate at epoch `1`, and the Noir runtime creates a 14,656-byte proof with 11 public inputs that verifies against the committed key.
- **SDK and Hosted Login:** `@veilpass/shared@0.1.0`, `@veilpass/sdk@0.1.0`, and `@veilpass/server@0.1.0` are public npm packages. A clean external installation imported all three successfully with zero reported vulnerabilities.
- **Database:** Drizzle migrations `0000` through `0002` were applied to Neon; the `veilpass` schema contains all eight required durable challenge, nullifier, credential, Merkle-tree, session, and cursor tables.
- **Two public dApps:** `https://login.veilpass.dev`, `https://app-a.veilpass.dev`, and `https://app-b.veilpass.dev` are verified Vercel domains. The automated `npm run production:acceptance` check confirms hosted-login health, both host routes, distinct origin-bound challenges, and rejection of an untrusted origin.
- **Regression verification:** TypeScript, ESLint, and 62 Vitest tests pass on the current release workspace.

### Wallet evidence at the time of this snapshot

At the time of this snapshot, wallet enrollment and the live replay, expiry, and revocation checks were still pending. They were completed on 2026-09-29 with a disposable Testnet credential and user-approved Freighter access/signature; see the current acceptance summary and redacted host capture above.

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
- At the time of this historical setup note, no live Freighter enrollment or host-to-host sign-in had been performed. Live App A login, replay, expiry, and revocation acceptance were completed on 2026-09-29; the root publication transaction was linked in the current report, and the review video remains unrecorded.
- The active Testnet gate has the non-empty epoch-1 root recorded in the current delivery status. Do not replace it with an empty root at the same epoch; restore the matching durable tree or rotate the gate to a new epoch before resetting state.

## Important scope boundary

The active hosted-login integration creates a local Noir/UltraHonk proof, refreshes the durable Merkle witness, and `/api/verify` checks the committed VK. `/api/proof/simulate` remains a non-production compatibility fixture but is not accepted by `/api/verify`. At the 2026-09-29 update, root publication, replay, expiry, and revocation evidence is complete. The remaining evidence item is the final review recording.

## Historical production configuration acceptance — 2026-09-14

This section supersedes the dated operational-status statements above where they describe the Testnet owner, initial root, or Vercel runtime configuration.

- Production deployment: [`DppC4sc1K3rwTsGa6RGn3ABQ39xQ`](https://vercel.com/my-team-11d97e25/veilpass/DppC4sc1K3rwTsGa6RGn3ABQ39xQ), status **Ready**, from commit `e070368`.
- Production aliases include [`https://www.veilpass.dev`](https://www.veilpass.dev) and `https://veilpass.dev`.
- `NEXT_PUBLIC_VEILPASS_CONTRACT_ID` and `NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT` were recreated as Vercel **Config** variables for Production and Preview. This is required because browser-facing `NEXT_PUBLIC_*` values must not be stored as write-only Secrets.
- `NEXT_PUBLIC_STELLAR_RPC_URL`, `NEXT_PUBLIC_STELLAR_NETWORK`, and `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` were likewise normalized to Config variables. The active single-origin login boundary is `https://www.veilpass.dev`.
- `VEILPASS_LOGIN_ORIGIN` and `VEILPASS_HOST_ORIGIN` are aligned with that exact active origin. Future App A/App B deployment must replace this single-origin boundary with the explicit final allowlist described in the runbook.
- `VEILPASS_GATE_OWNER_SECRET` is present only as a write-only Vercel Production Secret and is never committed or returned by an API.
- `GET https://www.veilpass.dev/api/health` returned HTTP `200` and `{ "ok": true }`; database, origins, contract/source identifiers, asset rule, issuer secret, and gate-owner secret all passed runtime validation.
- A deliberately invalid `POST /api/enrollment/challenge` request with `Origin: https://www.veilpass.dev` returned `PROOF_INVALID` (HTTP `400`), rather than `ORIGIN_MISMATCH`; this proves the current origin boundary accepted the request before payload validation.
