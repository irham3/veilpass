# `@veilpass/sdk`

Browser SDK for starting an origin-scoped VeilPass login through a popup. It opens the configured hosted login page, checks the popup's exact origin/source/state, posts a one-time challenge to the integrating host's backend, and submits the returned proof to that backend for server-side verification.

> **Product and release status (26 September 2026):** VeilPass is a Stellar **Testnet MVP**, not a mainnet product or a network-anonymity service. This checkout prepares version `0.2.1`; npm currently serves `0.2.0`, whose published README may lag this source until the reviewed `v0.2.1` release workflow completes. Check the [npm version history](https://www.npmjs.com/package/@veilpass/sdk?activeTab=versions) and [GitHub releases](https://github.com/irham3/veilpass/releases) before pinning a version. Review the [live integration docs](https://veilpass.dev/docs/quickstart) before adopting it.

## What this SDK does—and what the host must do

The SDK is a browser client only. It does **not** provide the host's API routes, durable challenge store, cryptographic verifier, chain policy adapter, rate limiter, or host application's own session system.

The integrating application must implement these same-origin routes because the SDK currently calls these fixed paths:

| Route | Required behavior |
| --- | --- |
| `POST /api/challenges` | Validate a small strict JSON body containing `gateId`; derive origin from trusted server configuration and the request; issue a cryptographically random challenge; bind its digest, gate, origin, expiry, and unused state in durable storage; return the `ChallengeResponse` contract. |
| `POST /api/verify` | Enforce request-size/rate limits; validate the strict `ProofResult`; derive trusted origin and gate policy server-side; verify the pinned proof and active chain policy; atomically consume challenge and nullifier; return `VerifyResult`; create the host's session only after successful verification. |

Do not use the public login service's endpoints as a substitute for the host-owned routes. The SDK's `fetch("/api/…")` requests go to the **host page's origin**. An example of the protocol and the additional production requirements is in [Quickstart](https://veilpass.dev/docs/quickstart), [Server verifier](https://veilpass.dev/docs/server), and [API reference](https://veilpass.dev/docs/api).

## Requirements

- A modern browser with popup and Web Crypto support; the host must open the login from a user gesture to avoid popup blocking.
- HTTPS for deployed host and login origins. HTTP is only supported on loopback during local development.
- A VeilPass login deployment with the relevant gate enabled.
- Host backend routes and durable, atomic replay protection as described above.
- A server-side proof verifier using the verification key and circuit version intended for the deployment.

The SDK is framework-agnostic, but it must only be imported and called from browser code. Do not call it in SSR or a server action.

## Install

```sh
npm install @veilpass/sdk
```

Pin and validate package versions through your normal lockfile/release process. The SDK depends on `@veilpass/shared` for response contracts.

## Client usage

```ts
import { VeilPass, VeilPassError } from "@veilpass/sdk";

const veilpass = new VeilPass({
  // Exact login service origin, without a path or wildcard.
  loginOrigin: "https://login.veilpass.dev",
});

loginButton.addEventListener("click", async () => {
  loginButton.disabled = true;
  try {
    const result = await veilpass.login({
      gateId: "premium-holder",
      timeoutMs: 120_000, // optional; default is 120 seconds
    });

    // The host's POST /api/verify has already verified the proof. That route
    // must have created your own server-side application session on success.
    if (result.ok && result.eligible) {
      window.location.assign("/account");
    }
  } catch (error) {
    if (error instanceof VeilPassError) {
      // Show a localized message based on error.code; do not show raw server
      // diagnostics or retry a spent challenge.
      showLoginError(error.code);
    } else {
      showLoginError("SERVICE_UNAVAILABLE");
    }
  } finally {
    loginButton.disabled = false;
  }
});
```

The class constructor accepts `{ loginOrigin: string }`. `login({ gateId, timeoutMs? })` returns a promise of `VerifiedLogin` or throws `VeilPassError`. The default timeout is `120_000` ms.

## Success contract

The SDK resolves with exactly this minimized result:

```ts
type VerifiedLogin = {
  ok: true;
  eligible: true;
  privateAppId: string;
  gateId: string;
  epoch: number;
  origin: string;
  expiresAt: string; // ISO-8601 timestamp
};
```

`privateAppId` is stable for the same enrolled credential, normalized host origin, and gate epoch; different origins receive different IDs. It is scoped pseudonymous identity, **not anonymity**, and may change after re-enrollment, epoch rotation, or policy changes.

## Error handling

`VeilPassError.code` is a stable code. Verifier errors include `CHALLENGE_EXPIRED`, `CHALLENGE_SPENT`, `ORIGIN_MISMATCH`, `GATE_MISMATCH`, `STALE_EPOCH`, `CREDENTIAL_EXPIRED`, `CREDENTIAL_REVOKED`, `PROOF_INVALID`, and `SERVICE_UNAVAILABLE`. Local popup lifecycle errors are `POPUP_BLOCKED`, `POPUP_CLOSED`, and `TIMEOUT`. Wallet-specific errors may be surfaced by the hosted login UI.

Start a new login for an expired or spent challenge. For `SERVICE_UNAVAILABLE`, use bounded exponential backoff and create a new challenge. Do not automatically retry user rejection, eligibility failure, or a revoked credential.

## Data flow and privacy boundary

1. A user gesture opens `{loginOrigin}/login` with the gate, host origin, and one-use state value.
2. Once the popup is ready, the SDK calls the host's `POST /api/challenges` and forwards the challenge only to the exact login origin.
3. The hosted login refreshes the credential witness, builds a proof locally, and posts it back to the host origin through the popup message channel.
4. The SDK checks popup origin, window source, state, and strict payload schema, then posts the proof to the host's `POST /api/verify`.
5. The host server verifies the proof and returns the minimized result. The host API—not the browser SDK—must bind a server session to the verified result.

The host does not receive the wallet address in the verification payload or success result. The host's verification endpoint **does receive the raw proof and public inputs**, including the credential commitment/root, login nullifier, revocation hash, challenge digest, origin, and timestamps. Treat the full body as sensitive transient data: disable request-body logging, tracing capture, analytics, and error-report attachment; never persist it. The issuer sees the address during enrollment. IP, browser/device fingerprint, timing, issuer knowledge, and later chain activity are outside the privacy boundary.

## Security checklist for host integrators

- Bind the configured HTTPS host origin and allowed gate on the server; do not trust an arbitrary body/header origin.
- Use unpredictable one-use challenges with short expiry, bind challenge to origin and gate, and consume challenge plus nullifier atomically across concurrent requests.
- Re-check active contract root, epoch, expiry, revocation, and proof validity server-side on every attempt.
- Use the exact pinned production verification key. Do not accept `simulated.ts`, `/api/proof/simulate`, or a browser-only eligibility verdict.
- Reject unknown fields, oversized bodies, wrong content types, and cross-origin requests. Apply rate limits to challenge issuance and verification.
- Set your own opaque session cookie only after server verification; use `Secure`, `HttpOnly`, an appropriate `SameSite`, path, and expiry.
- Redact proof fields and cookies from logs, monitoring, HAR files, screenshots, and support tickets.
- Keep login/host origins on HTTPS; never accept a wildcard origin in production.

## Compatibility and support

Only the documented constructor and method are public. The current `0.2.x` SDK uses fixed same-origin paths `/api/challenges` and `/api/verify`; custom endpoint paths are not configurable. Confirm this fits your app before integrating. The protocol and schema are versioned separately from your application; deploy server routes and hosted login changes with compatibility tests.

Read the [identity semantics](https://veilpass.dev/docs/identity), [error reference](https://veilpass.dev/docs/errors), and [threat model](https://veilpass.dev/docs/threat-model). Open implementation issues at [GitHub](https://github.com/irham3/veilpass/issues); report vulnerabilities privately to the repository owner.

## Development and license

From the repository's `frontend/` directory:

```sh
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run test:coverage:all
npm run pack:check
```

The package is MIT licensed; see [`LICENSE`](https://github.com/irham3/veilpass/blob/master/LICENSE). Source: [`frontend/packages/sdk`](https://github.com/irham3/veilpass/tree/master/frontend/packages/sdk).
