# `@veilpass/shared`

Runtime-validated TypeScript contracts and origin/field helpers shared by the VeilPass browser SDK and server verifier. This package does not connect to a wallet, open a popup, create a proof, issue credentials, verify cryptography, persist challenges, or create a host application session.

> **Product and release status (26 September 2026):** VeilPass is a Stellar **Testnet MVP**. This checkout prepares version `0.2.1`; npm currently serves `0.2.0`, whose published README may lag this source until the reviewed `v0.2.1` release workflow completes. Check the [npm version history](https://www.npmjs.com/package/@veilpass/shared?activeTab=versions) and [GitHub releases](https://github.com/irham3/veilpass/releases) before pinning a version. This package is not a mainnet security certification.

## Install

```sh
npm install @veilpass/shared
```

The package is ESM and CommonJS compatible. Browser-safe asynchronous hash helpers use Web Crypto and require a runtime that provides `crypto.subtle` (normally a secure browser context or current Node.js runtime).

## Public exports

| Import | Contents |
| --- | --- |
| `@veilpass/shared` | All public contracts, schemas, error codes, origin and field helpers |
| `@veilpass/shared/contracts` | Zod schemas and TypeScript contract types |
| `@veilpass/shared/origin` | `normalizeOrigin` and `NormalizedOrigin` |

Package exports are listed in [`package.json`](https://github.com/irham3/veilpass/blob/master/frontend/packages/shared/package.json). Unknown fields are rejected by the proof and result schemas. Parse untrusted network data before using it.

## Parse the host response

```ts
import { verifyResultSchema } from "@veilpass/shared";

const response = await fetch("/api/verify", {
  method: "POST",
  credentials: "same-origin",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(proofResult),
});

const result = verifyResultSchema.parse(await response.json());
if (!result.ok) {
  // Stable public error code and request ID; do not expose server diagnostics.
  console.error(result.error, result.requestId);
} else {
  // This is the intentionally minimized success contract.
  console.log(result.privateAppId, result.gateId, result.epoch, result.expiresAt);
}
```

`verifiedLoginSchema` is strict. Its fields are `ok`, `eligible`, `privateAppId`, `gateId`, `epoch`, `origin`, and `expiresAt`. It rejects a wallet address, proof, commitment, nullifier, revocation hash, or any other additional field.

## Validate an origin

```ts
import { normalizeOrigin } from "@veilpass/shared";

normalizeOrigin("https://APP.example:443/"); // "https://app.example"
normalizeOrigin("http://localhost:3000");    // allowed for local development
normalizeOrigin("http://app.example");       // throws: non-loopback HTTP is forbidden
normalizeOrigin("https://app.example/path"); // throws: an origin cannot contain a path
```

Origins must be absolute HTTP(S) URLs without credentials, wildcard hostnames, paths, queries, or fragments. HTTP is restricted to loopback development addresses. In production, configure exact HTTPS origins and compare the normalized origin against trusted server configuration; never authorize an origin because it appears in a request body.

## Proof request data is sensitive

`proofResultSchema` validates the payload sent from the hosted login to the **host's** `POST /api/verify` endpoint. It includes proof bytes and public inputs such as gate, epoch, origin, challenge hash, credential commitment/root, private app ID, one-time login nullifier, revocation hash, and timestamps. The schema excludes the wallet address, but these proof/public-input values are still sensitive and may be linkable within their documented scope. Do not log, persist, trace, or attach the request body to analytics or error reporting.

The successful result deliberately omits the proof and those public inputs. It does not claim to hide IP address, timing, browser/device fingerprint, issuer-side enrollment knowledge, or later on-chain activity.

## Stable verifier error codes

| Code | Meaning | Typical handling |
| --- | --- | --- |
| `WALLET_NOT_FOUND` | No supported wallet was detected | Explain the Freighter requirement |
| `WRONG_NETWORK` | Wallet is not on the configured Testnet | Ask the user to switch to Stellar Testnet |
| `USER_REJECTED` | User declined a wallet prompt | Let the user retry deliberately |
| `NOT_ELIGIBLE` | Account failed the configured asset rule | Explain the active gate rule without exposing balance data to the host |
| `CHALLENGE_EXPIRED` | One-time challenge expired | Start a fresh login and challenge |
| `CHALLENGE_SPENT` | Challenge/nullifier was already consumed | Start a fresh login; never replay the old payload |
| `ORIGIN_MISMATCH` | Trusted origin did not match proof/challenge | Fail closed and investigate configuration |
| `GATE_MISMATCH` | Gate differs from configured policy | Fail closed and use an allowed gate ID |
| `STALE_EPOCH` | Credential belongs to an old gate epoch | Re-enrollment may be required |
| `CREDENTIAL_EXPIRED` | Credential proof lifetime ended | Re-enrollment may be required |
| `CREDENTIAL_REVOKED` | Gate/credential was revoked | Do not retry the same credential |
| `PROOF_INVALID` | Schema, binding, root, or cryptographic proof failed | Fail closed; log only request ID and safe code |
| `ASSET_TRUSTLINE_REQUIRED` | Configured credit asset trustline is missing | Only relevant to a credit-asset deployment |
| `ASSET_CLAIMED` | One-time Testnet fixture was already claimed | Use the existing fixture/account policy |
| `RATE_LIMITED` | Service limit was reached | Back off; do not loop retries |
| `SERVICE_UNAVAILABLE` | A required service is temporarily unavailable | Retry with backoff and a **new** challenge |

The SDK can also raise local `VeilPassError` codes `POPUP_BLOCKED`, `POPUP_CLOSED`, and `TIMEOUT`; these are client lifecycle errors, not verifier response codes.

## Versioning and support

Use exact package versions in release builds and test schema compatibility before upgrading. Breaking changes to strict schemas, field encoding, or origin rules require a major version. Read the [privacy model](https://veilpass.dev/docs/privacy), [API reference](https://veilpass.dev/docs/api), and [threat model](https://veilpass.dev/docs/threat-model). Report security concerns privately to the repository owner; do not post exploitable details in public issues.

## Development and license

In the monorepo, run commands from `frontend/`:

```sh
npm ci
npm run typecheck
npm run test:coverage
npm run pack:check
```

The package is MIT licensed; see [`LICENSE`](https://github.com/irham3/veilpass/blob/master/LICENSE). Source and issue tracker: [github.com/irham3/veilpass](https://github.com/irham3/veilpass).
