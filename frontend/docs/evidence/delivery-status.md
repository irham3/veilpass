# Proposal delivery status

## Current status — 2026-09-27

This section supersedes the older completion claims below. The Testnet wallet enrollment is complete and verified in Chrome. Production health and `npm run production:acceptance` passed after the verifier-origin, CRS-cache, CSP, and cold-start fixes; live login succeeded twice on App A with a stable private ID and once on App B with a different ID, and `/api/verify` returned HTTP 200. GitHub `master` quality/build and browser/accessibility jobs both passed in [CI run 36250595645](https://github.com/irham3/veilpass/actions/runs/36250595645). Current local verification: 322/322 Vitest tests across 91 files; the coverage gate confirms statement hits in all 107 executable modules. Full-inventory coverage is 88.35% statements, 84.17% branches, 87.35% functions, and 91.17% lines, so aggregate coverage is not 100%.

The npm owner authorized the Trusted Publisher, and [release workflow `v0.2.1`, attempt 2](https://github.com/irham3/veilpass/actions/runs/36215791259/attempts/2) succeeded. `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server` are public at `0.2.1` with npm provenance attestations tied to tagged commit `3edf8974df9656a44a4361868b33dd3794d19ad1`. Clean registry install and CommonJS/ESM imports passed. The [GitHub Release](https://github.com/irham3/veilpass/releases/tag/v0.2.1) has three tarballs and `SHA256SUMS`; each archive checksum matched. See the [release verification](release-v0.2.1-verification-2026-09-27.md), [test report](test-report.md), and [demo guide](demo-end-to-end-guide-2026-09-25.md).

Remaining acceptance evidence: live replay/expiry/revocation checks, a redacted host request capture, and review video. Full-inventory branches/lines also remain below 100%.

The current Testnet gate root at the latest smoke read is `011886fe9e4b0870451e95aee95ff0bad35f2a8dd86444b306b27cd4ee98834c` at epoch 1. The post-enrollment witness refresh and proof verification both succeeded against production, confirming the live credential tree and contract root are usable. The public dashboard shows active Testnet contract `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`. Recheck the root after each successful enrollment; do not overwrite the active root with zero at the same epoch.

Historical note: `0.2.0` was published manually without provenance on 26 September 2026. The protected `0.2.1` release supersedes it with tagged source, Trusted Publisher provenance, package READMEs, and checksum-verified GitHub Release archives.

## Current operational status — 2026-09-17

This section supersedes older deployment-status rows below.

| Deliverable | Current status | Public evidence |
| --- | --- | --- |
| 1. Private Gate Core | Complete on Stellar Testnet | Active gate contract, 3/3 Rust tests, Testnet smoke, verified Noir proof runtime, and the current 132-test regression suite. |
| 2. SDK and Hosted Login | Complete except user-owned Freighter approval | Public `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server` packages; Neon durable schema; hosted login health check passes. The default Testnet gate uses native XLM, not a VeilPass-issued asset. |
| 3. Two-dApp Demo and Docs | Complete except live Freighter approval and excluded review video | Public exact origins for Login/App A/App B; automated public acceptance checks domain-bound challenges and hostile-origin rejection. |

Run `npm run production:acceptance` from `frontend/` to reproduce the safe public checks. The only required human action for live enrollment is the Freighter wallet access and message-signature approval; no seed phrase is requested or accepted by the application.

### Fresh operator checks — 2026-09-17

- `npm run production:acceptance` passed against `login.veilpass.dev`, `app-a.veilpass.dev`, and `app-b.veilpass.dev`; both challenges were origin-bound and an untrusted origin returned HTTP 403.
- `npm run contract:smoke` passed against the active Testnet contract. Gate `premium-holder` is owned by the configured owner at epoch `1` and currently has the canonical empty root (`00` repeated 32 bytes); the fixture revocation hash is not revoked.
- `npm run env:validate` passed for every required runtime variable without printing secret values.
- `npm run db:migrate` passed after loading the local `DATABASE_URL` (the first invocation without loading `.env.local` correctly failed closed against the default localhost database). A read-only schema query found ten VeilPass tables and four Drizzle migration records.
- `npm run proof:check` and `npm run pack:check` passed. No non-video automated blocker remains in the repository.
- Testnet VPT was issued to the supplied public holder address in transaction `905ef4093e621cb78d1229e01d6bd52c22db704ccdb47a58984e5551a514f1dd`; Horizon read-back confirmed `1.0000000 VPT` for that account.
- The public enrollment page was opened and the privacy disclosure was acknowledged. The Codex in-app browser does not expose the Freighter extension, so enrollment stopped at the wallet-connection step with `Freighter was not found`; no signature was bypassed.
- **Policy update — 2026-09-18:** the default gate is now native XLM (`VEILPASS_ASSET_TYPE=native`, minimum `1 XLM`). VPT is retained only as a legacy credit-asset fixture; native XLM requires no issuer, trustline, claim, swap, or asset distribution. A USDC/issued-asset rule remains available through `VEILPASS_ASSET_TYPE=credit` with its exact code and issuer.

Audit date: 2026-09-02

This is an evidence-based implementation status for the submitted Instawards scope. It distinguishes code that is tested today from work that still needs an operational deployment.

## Sections 1–3: project, intent, and objective

| Scope item | Evidence | Status |
| --- | --- | --- |
| VeilPass project identity and Stellar Testnet scope | Root `README.md`, environment template, and public deployment configuration | Implemented |
| Wallet-eligibility privacy boundary | [privacy docs](../../app/docs/[[...slug]]/page.tsx), `packages/shared/src/contracts.ts`, and privacy audit | Implemented as an interface boundary: the host response schema excludes wallet data; the default policy checks native Testnet XLM |
| Freighter enrollment objective | `components/enrollment/enrollment-flow.tsx` and enrollment API routes | Implemented, requires a user-controlled Testnet wallet with the configured native XLM minimum, a wallet signature, and durable storage; no custom trustline is needed |

## Section 4: in-scope deliverables

| Deliverable | Tested evidence | Current status |
| --- | --- | --- |
| 1. Private Gate Core — Soroban gate state, events, root, epoch, and revocation | `contracts/veilpass-gate`, 3 Rust tests, and current `npm run contract:smoke` output | Implemented and verified on Testnet |
| 1. Private Gate Core — membership circuit | `packages/proof/circuits/membership`; `npm run proof:check` runs circuit test → witness → UltraHonk prove → verify | Implemented and verified |
| 1. Private Gate Core — production credential Merkle lifecycle and individual revocation | `credential-tree.ts`, migration `0002_credential_merkle_tree.sql`, `root-publisher.ts`, witness refresh endpoint, and contract `is_revoked` checks | Implemented; live use needs a durable DB and a gate owner able to initialize/publish the root |
| 2. SDK and hosted login — popup, exact-origin channel, challenge endpoint, verifier boundary, and cookie session example | `packages/sdk`, `packages/server`, API routes, 58 unit tests, and browser privacy test | Implemented for the tested integration boundary |
| 2. SDK and hosted login — browser-local Noir proof | `packages/proof/src/noir.ts`, committed circuit/VK artifacts, `zk-verifier.ts`, and `npm run proof:runtime` | Implemented and verified with the pinned VK |
| 2. Freighter asset enrollment | Freighter Testnet UI, enrollment challenge, signed issue route, Horizon asset rule | Implemented; live execution needs user wallet and service configuration |
| 3. Two-dApp demo | `app-a.localhost` and `app-b.localhost` routes plus `npm run production:acceptance` against the three public HTTPS origins | Public origins and domain separation are verified; live wallet-backed login and reviewer evidence remain operator-controlled |
| 3. Docs, privacy model, threat model, test report, and gate dashboard | `/docs`, `README.md`, evidence directory, dashboard, and tests | Implemented; docs describe the ZK verifier and operational scope boundaries |
| 3. Review video and redacted live network capture | No review recording or capture is tracked in this repository | Not yet delivered |

## Section 5: execution plan evidence

| Planned checkpoint | Evidence available now |
| --- | --- |
| Week 1 — gate schema, origin normalization, proof inputs, contract/circuit harness | Soroban source/tests, normalized-origin tests, and reproducible Noir fixture check |
| Week 2 — enrollment, eligibility, challenge lifecycle, replay/expiry/revocation error handling | Freighter enrollment code, Horizon asset rule, in-memory/PostgreSQL challenge stores, verifier tests |
| Week 3 — SDK, popup, server session, dashboard, App A/App B | Buildable packages, popup channel tests, cookie-session route, dashboard, and separate local host routes |
| Week 4 — end-to-end public proof, durable database run, evidence capture, and review video | Source implementation and local proof verification are complete; durable live deployment and final recording require the operator-controlled services below |

## Reproduce the verified results

Run from `frontend/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run proof:check
npm run contract:test
npm run contract:smoke
npm run test:e2e
npm run build
npm audit --omit=dev
```

Remaining operational work: deploy the native-XLM configuration to the hosted login, run a real Freighter enrollment with the wallet owner, publish the resulting non-empty credential root and revocation transaction on Testnet, execute the live replay/expiry/revocation matrix, and record the reviewer walkthrough (video intentionally excluded from the current request). PostgreSQL migrations, local runtime configuration, contract ownership, package release, and all automated checks are verified.
