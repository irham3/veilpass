# `@veilpass/server`

Server-side proof-verification policy primitive for host applications integrating VeilPass. The library checks a submitted proof result against explicit host-owned origin/gate policy, a challenge-store callback, and a proof-verifier callback. It does **not** connect to PostgreSQL, issue challenges, read Soroban, load a verification key, configure rate limits, or create application sessions for you.

> **Product and release status (26 September 2026):** VeilPass is a Stellar **Testnet MVP**. This checkout prepares version `0.2.1`; npm currently serves `0.2.0`, whose published README may lag this source until the reviewed `v0.2.1` release workflow completes. Check the [npm version history](https://www.npmjs.com/package/@veilpass/server?activeTab=versions) and [GitHub releases](https://github.com/irham3/veilpass/releases) before pinning a version. This primitive is not a complete turnkey auth server and is not a mainnet security certification.

## Install

```sh
npm install @veilpass/server @veilpass/shared
```

This package uses Node.js crypto primitives and must run only in a trusted server runtime (Node.js 20+ is the supported VeilPass deployment baseline). Do not bundle it into a browser application, edge runtime without Node crypto compatibility, or client component.

## Public API

```ts
import {
  verifyVeilPassProof,
  type ChallengeConsumeInput,
  type ChallengeConsumeResult,
  type ChallengeStore,
  type GatePolicy,
  type ProofVerifier,
} from "@veilpass/server";
```

`verifyVeilPassProof(options)` returns a `VerifyResult` union. It accepts untrusted `proofResult: unknown` and validates it with the strict shared schema before verification.

```ts
type GatePolicy = {
  active: boolean;
  epoch: number;
  credentialRoot: string;
  owner?: string;
  isRevoked?: (revocationHash: string) => Promise<boolean>;
};

type ProofVerifier = (proofResult: ProofResult) => Promise<boolean> | boolean;

type ChallengeStore = {
  consume(input: ChallengeConsumeInput): Promise<
    | { ok: true }
    | { ok: false; error: VeilPassErrorCode }
  >;
};
```

The full `ChallengeConsumeInput` fields are `challengeId`, `challengeHash`, `gateId`, `origin`, `loginNullifier`, and `proofExpiresAt`.

## Basic invocation

```ts
import { randomUUID } from "node:crypto";
import { verifyVeilPassProof } from "@veilpass/server";

// Obtain all three dependencies from trusted server-side services/config.
const policy = await gatePolicyStore.get("premium-holder");
const result = await verifyVeilPassProof({
  proofResult: requestBody,
  expectedOrigin: "https://app.example.com",
  expectedGateId: "premium-holder",
  store: durableChallengeStore,
  policy,
  verifyProof: verifyWithPinnedNoirKey,
  requestId: randomUUID(),
});

// Return `result` with Cache-Control: no-store. Create your own session only
// after `result.ok === true`; use result.expiresAt to bound its lifetime.
```

This code is an API shape example. `gatePolicyStore`, `durableChallengeStore`, `verifyWithPinnedNoirKey`, request parsing, origin resolution, and HTTP response handling are intentionally host-owned integrations. Do not ship a permissive placeholder implementation for any of them.

## What the verifier checks

The verifier performs these checks before returning success:

1. Strict proof result and public-input schema.
2. Normalized exact expected origin and expected gate ID.
3. Proof creation time (with a limited five-minute future clock-skew allowance) and proof expiry.
4. Active gate, matching epoch, and credential root.
5. Optional per-credential revocation lookup.
6. Your `verifyProof` callback, which must perform actual cryptographic verification using the pinned verification key for the deployed circuit.
7. `store.consume`, which must atomically bind and consume the challenge and nullifier.

The function does not itself query a chain. `GatePolicy` must come from a trusted current policy source and must fail closed if the policy read fails or is stale. Set `active: false` when the whole gate is disabled; implement `isRevoked` against current trusted revocation state for every production gate that permits credential-level revocation. If the callback is omitted, this primitive does not detect per-credential revocations. Do not derive policy or expected origin from untrusted proof inputs.

## Critical persistence contract

The `ChallengeStore` interface intentionally contains only `consume`; challenge issuance belongs to your HTTP adapter. Your implementation must be durable across application instances and concurrent requests. In one database transaction or equivalent atomic primitive, it must:

- find and lock the unspent challenge by ID;
- reject missing, expired, or spent challenges;
- compare the stored challenge digest, trusted origin, and gate ID with the supplied values;
- ensure `proofExpiresAt` does not exceed the server-issued challenge expiry;
- insert a unique digest of the login nullifier; and
- mark the challenge spent, committing both changes together.

If either the challenge or nullifier is already consumed, return `{ ok: false, error: "CHALLENGE_SPENT" }`. Return stable `VeilPassErrorCode` values for other expected rejections. Throw only for unexpected infrastructure failures; catch those at your route boundary, return a safe `SERVICE_UNAVAILABLE` response, and never leak database messages.

The challenge route must issue 32 bytes of cryptographically secure random entropy, base64url-encode those raw bytes for the challenge response, and store only the protocol digest server-side. To match the current circuit, the public `challengeHash` is `fieldHexFromDigest(SHA256(base64urlDecode(challenge)))`; the helper maps the digest to the canonical 253-bit BN254 field representation. Do not hash the base64url text, compare the opaque challenge string as the field value, or invent a different encoding. The issuance and verification implementations must use compatible schema, encoding, gate, origin, and expiry rules. See the tested implementation in [`lib/server/challenge-store.ts`](https://github.com/irham3/veilpass/blob/master/frontend/lib/server/challenge-store.ts) and `packages/shared/src/field.ts`.

## HTTP boundary requirements

For the SDK to work, the host serves both endpoints on the same origin as the page:

### `POST /api/challenges`

- Accept a strict JSON object with `gateId`; reject unknown fields and oversized bodies.
- Resolve the host origin from trusted configuration/request validation and check an allowlist of exact HTTPS origins.
- Check that the requested gate is enabled for this host.
- Persist challenge digest, gate, origin, expiry, and unused state before returning `201` and `Cache-Control: no-store`.
- Return `challengeId`, base64url `challenge`, `gateId`, `origin`, and ISO-8601 `expiresAt`.
- Apply rate limits and anti-abuse controls.

### `POST /api/verify`

- Accept a strict `ProofResult` with a size cap and no request-body logging.
- Resolve trusted origin and gate policy on the server; reject mismatch before creating a session.
- Call `verifyVeilPassProof` with the current policy, durable store, and pinned cryptographic verifier.
- Return the safe `VerifyResult` union with `Cache-Control: no-store`.
- On success only, create your own opaque server session and set a host-only `Secure`, `HttpOnly`, `SameSite=Lax` cookie with expiry no later than the proof.

The current `0.2.x` browser SDK calls exactly `/api/challenges` and `/api/verify`; those paths are not configurable.

## Error results

Failures resolve to `{ ok: false, error, requestId }`; they are not thrown by `verifyVeilPassProof`. The error codes are defined by `@veilpass/shared`: `PROOF_INVALID`, `ORIGIN_MISMATCH`, `GATE_MISMATCH`, `CHALLENGE_EXPIRED`, `CHALLENGE_SPENT`, `CREDENTIAL_EXPIRED`, `CREDENTIAL_REVOKED`, `STALE_EPOCH`, and the other stable wallet/service codes. The function logs only a request ID, typed reason, and optional safe stage. Never log the submitted proof, challenge ID/hash, nullifier, revocation hash, or raw public-input object in your own observability layer.

## Privacy boundary

The successful response contains eligibility and origin-scoped identity fields; it excludes the Stellar wallet address. The host's verification endpoint still receives proof bytes and public inputs, including the commitment, root, nullifier, revocation hash, and challenge binding. Treat these as sensitive transient values and do not persist, log, attach to traces, or expose them to browser application code. VeilPass does not hide IP address, timing, browser/device fingerprint, issuer-side enrollment knowledge, or later on-chain activity.

## Compatibility, testing, and release

The package's public entry point and exported TypeScript types are listed in [`package.json`](https://github.com/irham3/veilpass/blob/master/frontend/packages/server/package.json). Lock `@veilpass/server` and `@veilpass/shared` together and add integration tests for valid proof, expired/spent challenge, origin/gate mismatch, stale epoch/root, revocation, concurrent replay, verifier failure, and session-cookie flags before production use.

Repository checks from `frontend/`:

```sh
npm ci
npm run typecheck
npm run test:coverage
npm run test:coverage:all
npm run pack:check
```

Read the [API reference](https://veilpass.dev/docs/api), [threat model](https://veilpass.dev/docs/threat-model), and [privacy model](https://veilpass.dev/docs/privacy). Report security vulnerabilities privately to the repository owner. MIT license: [`LICENSE`](https://github.com/irham3/veilpass/blob/master/LICENSE).
