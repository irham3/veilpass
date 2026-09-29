# Two-origin VeilPass host example

This example is the working App A and App B integration in the VeilPass reference application. It exercises the published package API through the repository's npm workspace and includes the host-owned challenge, proof-verification, and cookie-session routes. Run it from `frontend/`; the hosted-login and host adapters are in this repository, so this is a reference application rather than a starter that can be copied without adapting its server policy.

## What it demonstrates

| Surface | Source | Responsibility |
| --- | --- | --- |
| Browser login button and popup client | [`components/demo/host-demo.tsx`](../../components/demo/host-demo.tsx) | Calls `VeilPass.login()` from a user gesture, renders safe error codes, and displays only the minimized result. |
| Host challenge endpoint | [`app/api/challenges/route.ts`](../../app/api/challenges/route.ts) | Resolves exact trusted origin and gate, issues a one-use durable challenge, and returns `no-store`. |
| Host verification endpoint | [`app/api/verify/route.ts`](../../app/api/verify/route.ts) | Checks current policy and the pinned Noir proof, atomically consumes challenge/nullifier, then creates an HttpOnly session. |
| Host session endpoint | [`app/api/session/route.ts`](../../app/api/session/route.ts) | Reads a host-only cookie and returns the scoped ID and gate only. |
| Two host experiences | [`app/host/[host]/page.tsx`](../../app/host/%5Bhost%5D/page.tsx) | Serves App A and App B from distinct local hostnames with the same gate and origin-scoped identity. |

The client uses `@veilpass/sdk`; the host route uses `@veilpass/server`'s verifier contract, `@veilpass/shared` schemas and field helpers, the actual proof verifier, and the Soroban policy reader. The consumer tarball check (`npm run pack:check`) independently builds the public packages and validates their npm archives. This demo's routes are application adapters: the npm packages do not create a database, issue host challenges, read chain state, verify a pinned proof, or establish your cookie session automatically.

## Run the reference app

Requirements: Node.js 20+, npm 11, a supported browser, and the repository dependencies.

```powershell
cd frontend
npm ci
npm run env:local
npm run dev
```

Open these two hostnames in the same browser profile:

- `http://app-a.localhost:3000/host/app-a`
- `http://app-b.localhost:3000/host/app-b`

The generated local environment is a development scaffold. It does not provision PostgreSQL, make the local wallet an owner, or synchronize a credential Merkle root with a contract. Therefore it does not promise a real wallet-backed enrollment. To run the complete login path, use the deployed operator configuration or provide your own PostgreSQL database, trusted owner and issuer keys, active contract/gate root, exact origin allowlist, and eligible disposable Testnet wallet. Never copy production signing keys into local development.

## Verify the complete flow

1. Enroll a disposable wallet using the hosted enrollment UI; approve Freighter's address access and message signature yourself.
2. Open App A and start login from its button. A successful proof establishes an App A host cookie.
3. Reload App A and confirm the server-backed session is restored from `/api/session`.
4. Start a fresh App A login. Its `privateAppId` remains stable for the same credential and gate epoch.
5. Open App B and log in with a fresh challenge. The `privateAppId` differs because the exact origin is part of the proof binding.
6. Check replay, expiry, and revocation only with disposable Testnet credentials. The linked acceptance report records the live outcomes; the browser suite covers reproducible UI, HTTP, and policy regressions.
7. Confirm no wallet address appears at either host. The verifier does receive sensitive proof bytes and public inputs, which must not be logged, traced, or persisted.

Run automated acceptance and package checks from `frontend/`:

```powershell
npm run test:system
npm run test:security
npm run pack:check
npm run production:acceptance
```

The silent local [UI review tour](../../docs/evidence/veilpass-ui-review-tour.webm) covers the landing page, the clearly labeled simulation, developer docs, and both host pages. It does not contain a wallet approval or live proof and must not be presented as the Testnet acceptance recording.

`test:system` uses controlled test fixtures for repeatable browser coverage; `production:acceptance` checks the public endpoints and origin binding but does not approve a wallet prompt. Only a holder-controlled live run demonstrates current wallet enrollment and proof issuance. See [the detailed demo walkthrough](../../docs/demo-guide.md), [the privacy model](https://veilpass.dev/docs/privacy), [the server integration guide](https://veilpass.dev/docs/server), and [dated live evidence](../../docs/evidence/live-acceptance-checklist.md).
