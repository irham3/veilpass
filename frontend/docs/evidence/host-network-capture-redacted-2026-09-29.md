# Redacted live host capture — 2026-09-29

This evidence records the production host boundary from the connected Chrome session. Raw request bodies, proofs, cookies, challenge identifiers, private IDs, wallet addresses, and revocation hashes were not written to this file or copied into the repository.

## Successful App A verification

| Direction | Route | Result | Redacted fields observed |
| --- | --- | --- | --- |
| App A → App A | `POST /api/verify` | HTTP 200, `ok: true` | Request keys: `challengeId`, `proof`, `publicInputs`. No Stellar StrKey address pattern was present in the request body. |
| App A → browser | `POST /api/verify` response | HTTP 200 | Response keys: `ok`, `eligible`, `privateAppId`, `gateId`, `epoch`, `origin`, `expiresAt`. No Stellar StrKey address pattern was present. The `privateAppId` value is intentionally omitted. |

The response identifies the gate result for App A only. Proof bytes and public inputs remain sensitive verifier data and must not be logged by an integrating host.

## Negative cases

| Case | Route or action | Result |
| --- | --- | --- |
| Replay | Re-submit the already-consumed App A proof to `POST /api/verify` | HTTP 400, `ok: false`, `CHALLENGE_SPENT`; failure response had no `privateAppId`. |
| Expiry | Submit a fresh, unused proof after its server-side `proofExpiresAt` | HTTP 400, `ok: false`, `CREDENTIAL_EXPIRED`. The request was held locally and its original submission was canceled, so the challenge had not been consumed before the expired submission. |
| Revocation | Fresh login attempt after Testnet owner revocation | App A displayed `CREDENTIAL_REVOKED`; a direct Testnet `is_revoked` read returned `true`. |

The revocation was confirmed by [Testnet transaction `c3e8eb3855eeca0b99cd9912f020a668ef516a67313edf1459fe4620200cf261](https://stellar.expert/explorer/testnet/tx/c3e8eb3855eeca0b99cd9912f020a668ef516a67313edf1459fe4620200cf261). The contract owner, credential epoch, active root, and unique durable credential record were checked before submission.

## Capture limits

This is a redacted evidence summary, not a raw HAR file. The browser session did not save or export a HAR because it would contain proof material and one-time identifiers. Only endpoint paths, response status/error codes, schema key names, and the presence/absence check for a Stellar address were retained. The original proof values, cookie values, holder address, and credential identifiers were not persisted in this report.
