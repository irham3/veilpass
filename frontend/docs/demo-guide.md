# VeilPass Demo and Technical Review Guide

This guide describes the repository state and the public Testnet deployment as of **29 September 2026**. Use it to prepare a developer demo, reproduce the automated checks, and distinguish simulated UI from cryptographic and chain-backed acceptance.

## Contents

1. [Choose the right demo path](#1-choose-the-right-demo-path)
2. [Prerequisites and preflight](#2-prerequisites-and-preflight)
3. [Local setup](#3-local-setup)
4. [Public user journey](#4-public-user-journey)
5. [SDK integration example](#5-sdk-integration-example)
6. [Security and rejection evidence](#6-security-and-rejection-evidence)
7. [Documentation and operator review](#7-documentation-and-operator-review)
8. [Verification commands](#8-verification-commands)
9. [Known product boundaries](#9-known-product-boundaries)

## 1. Choose the right demo path

| Path | What it proves | What it does not prove |
| --- | --- | --- |
| Landing page interactive bench at `https://veilpass.dev/#two-app-demo` or `/demo` | The UI communicates scoped IDs, replay rejection, and simulated revocation behavior | A Noir proof, wallet enrollment, a server session, or a Soroban transaction. The UI labels this flow **Interactive simulation**. |
| Public App A and App B | Real host pages at separate origins; popup SDK wiring, host challenges, server verification, and each origin's session boundary | A fresh enrollment if the holder credential is already stored or has been revoked. |
| Automated Playwright and package checks | Reproducible browser behavior, rejection paths, accessibility checks, built package artifacts and package import smoke tests | User approval in Freighter or a new owner-authorized Testnet transaction. |

Never use a simulated panel as evidence of a live chain or zero-knowledge operation. For a reviewer acceptance, open the live hosts and inspect the dated evidence listed in [the live acceptance checklist](evidence/live-acceptance-checklist.md).

## 2. Prerequisites and preflight

### For the public demo

- A current desktop Chrome/Chromium or a modern mobile browser.
- Freighter for a new enrollment; keep it on **Stellar Testnet**.
- A disposable Testnet holder account with the minimum native XLM balance shown on the enrollment page. Freighter signs an off-chain enrollment message; enrollment does not transfer funds.
- A separate operator account and explicit owner approval only if you are demonstrating contract writes or revocation. Do not reuse a holder credential after revoking it.
- A clean browser profile with popups permitted for `login.veilpass.dev`.

Do not enter a seed phrase into VeilPass, a terminal, a form, or a recording. Review the current `contract:smoke` result and the durable credential-tree status with the operator before enrollment. A successful health endpoint alone does not prove that the on-chain root matches the server's Merkle tree.

### For repository checks

- Node.js 20 or newer and npm 11 as pinned by `frontend/package.json`.
- Rust/Cargo for Soroban tests.
- WSL on Windows, or the pinned Nargo and Barretenberg toolchain on Linux, for `proof:check`.
- Playwright browser dependencies for browser tests.
- PostgreSQL only when running the production-like host adapters or live enrollment locally.

## 3. Local setup

From the repository root, use PowerShell:

```powershell
cd frontend
npm ci
npm run env:local
npm run env:validate
npm run dev
```

Open `http://localhost:3000`. `env:local` creates an ignored development template; it does not provision PostgreSQL, synchronize an on-chain root, or make the production issuer ready. `env:validate` is a structural check and prints issue codes rather than secret values.

For a full local enrollment, configure a disposable local Testnet deployment with a durable PostgreSQL database, the matching owner and issuer services, an exact local origin allowlist, and a credential tree whose root matches the active gate. Do not copy production secrets onto a development machine. See [runtime configuration](https://veilpass.dev/docs/quickstart), [the operator runbook](evidence/operator-acceptance-runbook-2026-09-10.md), and [`../.env.example`](../.env.example).

The local `.env.example` and `env:local` helper are not substitutes for the variables supplied by a deployed environment. `VEILPASS_HOST_ORIGIN` is the exact comma-separated host allowlist; `VEILPASS_LOGIN_ORIGIN` and `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` identify the hosted login origin. PostgreSQL is required for durable challenge, enrollment, nullifier, session, and Merkle-tree records.

## 4. Public user journey

The production review path uses the three public origins:

- Landing and docs: [https://veilpass.dev](https://veilpass.dev)
- Hosted login and enrollment: [https://login.veilpass.dev](https://login.veilpass.dev)
- Host dApps: [https://app-a.veilpass.dev](https://app-a.veilpass.dev) and [https://app-b.veilpass.dev](https://app-b.veilpass.dev)

### A. Review the privacy boundary

1. On the landing page, explain that the issuer sees the wallet address during enrollment, but the host does not receive it from the login verifier.
2. Open the privacy model and threat model from the landing footer or the docs sidebar.
3. State the limit accurately: the host's `/api/verify` receives a proof and public inputs, including commitment, root, challenge binding, login nullifier, and revocation hash. These are sensitive transient values; do not log or persist them. VeilPass is not an anonymity or network-privacy product.

### B. Inspect the gate and enroll

1. Open `https://login.veilpass.dev/dashboard` and compare the displayed contract ID, gate, epoch, owner, and root with the current Testnet read.
2. Open `https://login.veilpass.dev/dashboard/enroll` in the same browser profile that will be used for both host apps.
3. Read and accept the enrollment disclosure. Select **Connect Freighter and enroll**.
4. If Freighter asks to share the active public address, approve that request yourself. Confirm the wallet is on Testnet and the eligible native XLM balance is present.
5. Review the exact enrollment message and approve the off-chain signature yourself. VeilPass stores the subject secret and credential in this browser's IndexedDB; the service issuer knows the wallet address during enrollment.
6. Wait for the completion state confirming the credential is stored. If root publication or durable storage fails, stop; do not continue with a stale root or an in-memory production adapter.

### C. Compare App A and App B

1. In the same profile, open App A and select **Login with VeilPass** from a user gesture so the browser permits the popup.
2. In the login popup, continue with the local credential. The browser refreshes the current witness and generates the membership proof locally. The host's trusted server verifies it and creates its own HttpOnly session cookie only after success.
3. Record the minimized result fields: `eligible`, `privateAppId`, `gateId`, `epoch`, `origin`, and `expiresAt`. Do not record or export the raw proof or proof public inputs.
4. Sign in to App A again with a newly issued challenge. The `privateAppId` must remain the same while the credential and gate epoch stay unchanged.
5. Open App B in the same browser profile and sign in. Its `privateAppId` must differ from App A's because the normalized host origin is bound into the proof.
6. Verify `/api/session` independently on each host if the developer demo provides it. App A and App B have separate host-only cookies; a VeilPass result is not itself an application session.

### D. Verify the host boundary

Use browser DevTools Network only for inspection. The host address must not appear in host challenge, verify, session, browser storage, or UI data. The `/api/verify` body includes sensitive cryptographic proof fields even though it excludes the wallet address. Redact both wallet and proof fields before saving a screenshot/HAR; also remove cookies, challenge values, nullifiers, revocation hashes, IPs, and unrelated personal data. Enrollment requests are a different privacy boundary and may contain the wallet address at the issuer.

## 5. SDK integration example

The published SDK is a browser popup client. It calls the integrating host's own `POST /api/challenges` and `POST /api/verify` routes. The host owns durable challenge/nullifier consumption, chain policy reads, pinned proof verification, rate limiting, and its cookie session. Installing the browser SDK does not create these server adapters.

```sh
npm install @veilpass/sdk @veilpass/shared
```

Call the SDK only from a browser event handler:

```ts
import { VeilPass, VeilPassError } from "@veilpass/sdk";

const veilpass = new VeilPass({ loginOrigin: "https://login.veilpass.dev" });

async function signInFromButton() {
  try {
    const result = await veilpass.login({ gateId: "premium-holder" });
    // /api/verify has already accepted the proof; the host route must have
    // created its own session cookie only after that server-side success.
    if (result.ok && result.eligible) window.location.assign("/account");
  } catch (error) {
    const code = error instanceof VeilPassError ? error.code : "SERVICE_UNAVAILABLE";
    showSafeLoginMessage(code);
  }
}
```

Do not call `VeilPass.login()` during server rendering, from a server action, or without a user gesture. Do not store the proof, public inputs, cookie, or wallet address in client analytics. Review [the SDK guide](https://veilpass.dev/docs/client), [server adapter contract](https://veilpass.dev/docs/server), [API reference](https://veilpass.dev/docs/api), and the versioned README included in each npm package before deploying.

## 6. Security and rejection evidence

### Public and automated checks

From `frontend/`, `npm run production:acceptance` checks hosted-login health, the public App A/B routes and their exact-origin challenge separation, hostile-origin rejection, and public eligibility configuration. It does not sign into Freighter or prove holder identity. The browser suite exercises both successful mocked UI journeys and negative verifier cases; distinguish those from live wallet acceptance in every report.

### Live rejection cases

Use only a disposable Testnet credential, and record the request ID plus error code rather than sensitive request bodies. Current evidence is in [`live-acceptance-checklist.md`](evidence/live-acceptance-checklist.md), [`host-network-capture-redacted-2026-09-29.md`](evidence/host-network-capture-redacted-2026-09-29.md), and [`test-report.md`](evidence/test-report.md).

- **Replay:** a consumed host challenge must return `CHALLENGE_SPENT`; a fresh attempt requires a new server challenge.
- **Expiry:** an unused proof sent after its `proofExpiresAt` must return `CREDENTIAL_EXPIRED`. If the shorter server challenge expires first, `CHALLENGE_EXPIRED` is also a correct fail-closed result. Record the times and returned code to distinguish them.
- **Revocation:** the gate owner submits the revocation through Freighter, verifies the Testnet transaction and `is_revoked` state, then starts a fresh login. It must return `CREDENTIAL_REVOKED`. Existing host sessions may remain valid until their own expiry; revocation blocks new proof acceptance, not retroactive cookie invalidation.
- **Origin/gate mismatch:** an origin outside the exact allowlist must be rejected. Public acceptance sends an untrusted challenge request and expects HTTP 403; no login popup is required for that check.

The current live acceptance already records successful App A repeat login, App B domain separation, replay, expiry, revocation, root update transaction, and a redacted host request/response summary. It does not contain a review recording of that live browser sequence.

## 7. Documentation and operator review

Use the docs sidebar to navigate: **Start** (overview, quickstart, enrollment), **Integrate** (client, server, identity, contract), and **Reference** (errors, privacy, threat model, API, examples). The web docs are generated from `lib/docs/content.ts`; the GitHub root README describes the repository; each npm page uses the README shipped inside that package. They serve different audiences but must agree on routes, API contracts, security limits, and release status.

For a technical review, show these in order:

1. Public landing and privacy model.
2. Live contract/gate state and contract evidence.
3. Enrollment flow and the exact disclosure.
4. App A twice, then App B once, comparing only the private ID.
5. The redacted host capture and host-only session boundary.
6. Replay, expiry, and revoked-credential rejection evidence.
7. Developer quickstart, API reference, server responsibilities, and npm package READMEs.
8. Automated test report, release provenance, and explicit out-of-scope items.

## 8. Verification commands

Run from `frontend/`:

```powershell
npm ci
npm run lint
npm run typecheck
npm run docs:check
npm run test:coverage
npm run test:coverage:all
npm run contract:test
npm run proof:check
npm run pack:check
npm run build
npm run test:e2e
npm run test:a11y
npm run production:acceptance
```

`test:coverage` measures the curated core. `test:coverage:all` is the whole executable JavaScript/TypeScript inventory gate; Rust contract tests and Noir circuit/proof checks run through their native toolchains and do not contribute a V8 percentage. Always cite the current command output and commit; dated values in `test-report.md` are snapshots, not a permanent guarantee.

## 9. Known product boundaries

- This release and Soroban deployment target Stellar Testnet. SOW scope excludes mainnet deployment, an independent production security audit, recovery, blind issuance, and general-purpose credential markets.
- The issuer can associate enrollment with a wallet address. Host dApps do not receive that address as part of login verification, but they receive proof/public-input data that must be protected.
- VeilPass does not hide IP addresses, network timing, browser/device fingerprints, issuer knowledge, or later public chain activity.
- VeilPass provides protocol primitives and hosted login. A third-party host must still implement secure, durable, atomic and correctly configured server adapters before enabling real users.
