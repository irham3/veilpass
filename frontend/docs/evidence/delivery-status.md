# Proposal delivery status

Audit date: 2026-09-02

This is an evidence-based implementation status for the submitted Instawards scope. It distinguishes code that is tested today from work that still needs an operational deployment.

## Sections 1–3: project, intent, and objective

| Scope item | Evidence | Status |
| --- | --- | --- |
| VeilPass project identity and Stellar Testnet scope | Root `README.md`, environment template, and public deployment configuration | Implemented |
| Wallet-eligibility privacy boundary | [privacy docs](../../app/docs/[[...slug]]/page.tsx), `packages/shared/src/contracts.ts`, and privacy audit | Implemented as an interface boundary: the host response schema excludes wallet data |
| Freighter enrollment objective | `components/enrollment/enrollment-flow.tsx` and enrollment API routes | Implemented, requires a user-controlled Testnet wallet, VPT trustline, funding, issuer key, and durable storage to run live |

## Section 4: in-scope deliverables

| Deliverable | Tested evidence | Current status |
| --- | --- | --- |
| 1. Private Gate Core — Soroban gate state, events, root, epoch, and revocation | `contracts/veilpass-gate`, 3 Rust tests, and current `npm run contract:smoke` output | Implemented and verified on Testnet |
| 1. Private Gate Core — membership circuit | `packages/proof/circuits/membership`; `npm run proof:check` runs circuit test → witness → UltraHonk prove → verify | Implemented and verified |
| 1. Private Gate Core — production credential Merkle lifecycle and individual revocation | `credential-tree.ts`, migration `0002_credential_merkle_tree.sql`, `root-publisher.ts`, witness refresh endpoint, and contract `is_revoked` checks | Implemented; live use needs a durable DB and a gate owner able to initialize/publish the root |
| 2. SDK and hosted login — popup, exact-origin channel, challenge endpoint, verifier boundary, and cookie session example | `packages/sdk`, `packages/server`, API routes, 58 unit tests, and browser privacy test | Implemented for the tested integration boundary |
| 2. SDK and hosted login — browser-local Noir proof | `packages/proof/src/noir.ts`, committed circuit/VK artifacts, `zk-verifier.ts`, and `npm run proof:runtime` | Implemented and verified with the pinned VK |
| 2. Freighter asset enrollment | Freighter Testnet UI, enrollment challenge, signed issue route, Horizon asset rule | Implemented; live execution needs user wallet and service configuration |
| 3. Two-dApp demo | `app-a.localhost` and `app-b.localhost` routes are tested as distinct browser origins; the public `/demo` remains a controlled reviewer bench | Local two-host routing implemented; public independently deployed origins still need deployment configuration |
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

Remaining operational work: configure a PostgreSQL service, provide the Testnet gate-owner signer to initialize/publish the root, deploy App A/App B to independent HTTPS origins, run a live Freighter enrollment, and record the reviewer walkthrough. These actions cannot be completed safely from this repository without the owner-controlled credentials and wallet approval.
