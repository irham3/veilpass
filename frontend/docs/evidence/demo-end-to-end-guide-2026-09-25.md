# VeilPass Complete Demo and Developer Release Gate

**Updated:** 30 September 2026
**Environment:** Stellar Testnet; `https://veilpass.dev`, `https://login.veilpass.dev`, `https://app-a.veilpass.dev`, and `https://app-b.veilpass.dev`.

**Current acceptance record:** Live Freighter enrollment is complete. App A sign-in succeeded twice and App B sign-in succeeded once in the same Chrome profile. On 29 September, a backup Testnet holder account signed in to App A; replay was rejected with `CHALLENGE_SPENT`, an unused proof submitted after expiry was rejected with `CREDENTIAL_EXPIRED`, and a new sign-in after on-chain revocation was rejected with `CREDENTIAL_REVOKED`. App A retained the same private ID across successful logins, while App B produced a different ID. Do not record or copy raw private IDs or proofs. The three npm packages at `0.2.2` were published with provenance from tag `v0.2.2`; registry READMEs match the source, clean CJS/ESM installation and imports passed, and package archive checksums were verified. See [release verification](release-v0.2.2-verification-2026-09-29.md).

**Release gate update:** The earlier support reference `af2f4b9d-34f5-47a8-b371-84c8b894ed10` was caused by an invalid contract StrKey and a root mismatch. The Production/Preview contract configuration was corrected to `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`. After live sign-in exposed a localhost origin from SSR and a CRS initialization failure on Vercel, deployment [`dpl_D5pR6QWm7Ci1LWLCeN3y2W7MmmJe`](https://vercel.com/my-team-11d97e25/veilpass/D5pR6QWm7Ci1LWLCeN3y2W7MmmJe) fixed both and reached READY. `/api/health`, automated production acceptance, and live `/api/verify` checks passed. The credential was stored after the holder approved wallet access and signed the enrollment message. App A sign-in succeeded twice and App B once. On 29 September, replay, expiry, revocation, and sign-in after revocation were also tested live; a concise redacted capture is available. The root and revocation transactions are listed in the acceptance checklist. The current [English developer explainer](VeilPass_Developer_Explainer_EN_2026-09-30.mp4) is a designed product overview covering SDK installation and integration boundaries; it is not a recording of live login or the Freighter approval popup. See the acceptance worksheet at the end of this guide.

## 1. Choose a presentation path

- **Quick visual path:** `/demo` is a local simulation with fixed IDs and errors. Use it to explain App A/App B, replay, and revocation in about one minute. Keep the “Simulated proof” label visible. This path is **not** evidence of a proof, cookie, or Testnet transaction.
- **Live acceptance path:** enroll at `login.veilpass.dev`, then use **Login with VeilPass** on two distinct HTTPS hosts. This path requires the holder's Freighter wallet, Testnet XLM, durable database storage, issuer and owner configuration, a matching Merkle root, and the deployment built from the commit being presented.

Recommended order: privacy context → gate state → enrollment → first App A login → second App A login → App B → network and cookie boundary → replay → expiry → revocation → integration docs → product limits. Do not change the epoch or revoke the credential before recording the three successful logins.

## 2. Requirements and pre-demo checks

1. Use Chrome or Chromium with Freighter installed and unlocked. Select **Stellar Testnet** and one demo account you control. An account whose earlier credential was revoked can be reused: reenrollment creates a new credential and revocation hash. Never enter a seed phrase on the site, in a recording, in a terminal, or in the repository. The account must have at least the native XLM minimum shown on the enrollment page, plus enough balance for the base reserve and Testnet fees.
2. Use the deployment that contains the code being presented. Source publication, Vercel deployment, and npm publication are separate steps. If the deployment or npm package is older, state its actual version; a local build does not update either one.
3. From `frontend/`, run these checks in order. Stop the live presentation if any security gate fails.

   ```powershell
   npm ci
   npm run env:validate
   npm run lint
   npm run typecheck
   npm run test:coverage
   npm run test:coverage:all
   npm run contract:test
   npm run proof:check
   npm run pack:check
   npm run build
   npm run test:e2e
   npm run production:acceptance
   npm run contract:smoke
   ```

4. `GET https://login.veilpass.dev/api/health` must return HTTP 200 with `ok: true` and `issues: []`. Public acceptance checks health, routing/challenges, origin allowlisting, and navigation; it does not prove wallet-based proof login by itself.
5. Confirm that the production PostgreSQL database has been migrated, `DATABASE_URL` is active for the service issuing challenges and sessions, and the issuer and gate owner are configured at the correct server boundary. Secret variables must not use the `NEXT_PUBLIC_` prefix. Do not show environment values on screen.
6. Read the output of `npm run contract:smoke` and record the active contract ID, gate, epoch, and root. The audited root is nonzero and must match the durable tree containing the credential. If the old tree is unavailable, the owner may rotate to a new epoch with an empty root only after accepting that existing credentials will stop working. Never replace the root within the same epoch merely to make an empty database appear consistent.
7. Prepare a clean holder browser profile and a separate operator browser/profile. Open DevTools → Network → Preserve log on both hosts. Disable any screen capture that could expose seed phrases or unnecessary Freighter details. Store only redacted data.

### Holder and operator tasks during a live recording

1. **Holder:** select the holder account in Freighter and set the network to **Stellar Testnet**. Confirm a balance of at least 1 Testnet XLM, then open `https://login.veilpass.dev/dashboard/enroll` in the same Chrome profile used for App A and App B. Do not switch accounts during the demo. If the account needs funds, use the Friendbot prompt in Freighter or [Stellar Lab Fund Account](https://lab.stellar.org/account/fund) with the **public address only**.
2. **Holder:** before enrollment, start Windows screen recording with **Win + Shift + R**. Select an area that includes Chrome and the Freighter popup, then click **Start**. Make a short test recording and confirm the popup is visible. Do not open seed phrases, secrets, or unnecessary account details. When finished, click **Stop**, save the local video, and review it before sharing. See [Microsoft's Snipping Tool instructions](https://support.microsoft.com/en-us/windows/apps/use-snipping-tool-to-capture-screenshots).
3. **Holder:** accept the disclosure, click **Connect Freighter and enroll**, then approve the public-address access and enrollment **sign message** in Freighter. This is an off-chain message; stop and inspect if the popup shows a transaction or asset transfer. Wait for **Credential stored in this browser**. Keep the recording running for two App A logins and one App B login.
4. **Operator:** check service health, the contract epoch/root, and the root-update transaction result. Run replay and revocation checks only against this demo credential. The owner signer is held in the operator's local configuration, and its public address must match the contract owner; the holder does not need the owner account in Freighter. Do not show secrets, proofs, cookies, private IDs, or revocation hashes in recordings or public artifacts.
5. **Holder:** sign in twice on App A, then once on App B. Show the success state and each origin. The host result includes a private ID, so keep raw footage local until that value is obscured. After the operator confirms replay rejection and revocation, try a **new login** on App A to show `CREDENTIAL_REVOKED`. Stop recording and send the operator the **local file path** for redaction review; do not upload raw footage directly.

## 3. Normal presentation script

| Screen | Action | Required result and evidence |
| --- | --- | --- |
| Landing page `https://veilpass.dev` | Explain that the issuer sees the address during enrollment, while the host does not receive it during login. Open the FAQ, privacy model, and threat model from the footer. | Every link opens an existing documentation page. Explain that the host verifier **receives proof and public inputs** as temporarily sensitive data even though the successful response is minimized. VeilPass does not hide IP addresses, fingerprints, or timing. |
| Dashboard `https://login.veilpass.dev/dashboard` | Show the contract ID, `premium-holder`, epoch, root, and Testnet status. Compare them with `contract:smoke`. | Dashboard values match chain reads. Save a screenshot that contains no secrets. |
| Enrollment `/dashboard/enroll` | Read the disclosure, accept it, click **Connect Freighter and enroll**. Approve public-address access if requested, then approve the enrollment message once in Freighter. Do not switch accounts mid-flow. | Progress ends at **Credential stored**. The signed message is off-chain, not an asset transfer. Record the root-update transaction hash from operator logs or the chain explorer and the new root; do not record the address, signature, credential secret, or proof. If publishing the root fails, do not continue to login. |
| App A `https://app-a.veilpass.dev` | Click **Login with VeilPass**. The login-origin popup opens; keep the enrollment/profile that stores the credential. Wait for local proof generation and server verification. | The host shows **Host session verified**, `ok: true`, `eligible: true`, `privateAppId`, `gateId`, `epoch`, `origin`, and `expiresAt`. `GET /api/session` on App A reports `authenticated: true`; the `vp_session` cookie has `HttpOnly`, `Secure`, and `SameSite=Lax`. Record the ID as `A1` without copying the proof. |
| Repeat App A login | Sign in again before the credential or epoch changes. This attempt must use a fresh challenge. | Record `A2`; `A2 = A1`. The old challenge is not reused. |
| App B `https://app-b.veilpass.dev` | In the same holder profile, click login. | Record `B1`; `B1 ≠ A1`, and `origin` is App B. App B receives its own session cookie on origin B. |
| Host privacy check | In App A/B Network panels, inspect `/api/challenges`, `/api/verify`, `/api/session`, and the successful response. | The user's Stellar `G...` address does not appear in host requests or responses. **Do not** conclude that the proof is anonymous: `/api/verify` carries proof, commitment, nullifier, and revocation hash. Redact these values before sharing HAR files or screenshots. The issuer can see the address during enrollment; keep enrollment captures separate from host captures. |

If the popup closes, Freighter uses the wrong network, the account is ineligible, the root differs, or health returns HTTP 503, show the error code and stop acceptance claims. After fixing the cause, retry with a new challenge.

If the page shows **Available in IndexedDB** but cannot find the credential witness in the active tree, choose **Re-enroll this browser** if offered after witness failure. Complete enrollment with the intended Freighter account, then start a fresh login from App A/B. If the service returns HTTP 503, check the contract ID, on-chain root, and PostgreSQL tree first; reenrollment does not fix an incorrect service configuration.

## 4. Real rejection scenarios

Run these only with the demo account/credential. DevTools must inspect the `/api/verify` body for replay/expiry tests; that body is sensitive. Never paste it into chat, an issue, a repository, or raw video. Delete local copies after testing and retain only the redacted outcome code and request ID.

1. **Replay.** After a successful App A login, use DevTools Network → `POST /api/verify` → **Replay XHR** or **Copy as fetch**, then submit it once more on the same App A origin. The expected result is `ok: false`, `error: CHALLENGE_SPENT`, with no new session. Do not use the `/demo` replay button as evidence for this check.
2. **Expiry.** Obtain a new proof and request on App A, hold the initial `/api/verify` submission (for example, using request interception in the test harness/operator browser), then submit the body after `proofExpiresAt` in the public inputs. The expected result is `CREDENTIAL_EXPIRED`. If the five-minute challenge expires first, `CHALLENGE_EXPIRED` is also a valid rejection; record which occurred. Waiting after a successful login and replaying its old body tests replay/expiry according to check order, so do not claim an isolated expiry test without recording request timing.
3. **Revocation.** Obtain only the demo credential's `revocationHash` from safe operator-side verification inputs or operator credential records; do not show it in raw video. The operator confirms the gate ID, epoch, and local signer public address match the on-chain owner, then signs a revocation for the demo hash. If the owner is available in Freighter, alternatively use `/dashboard` → **Revoke** and approve the transaction in the owner wallet. Record the transaction hash and confirm `is_revoked=true` on-chain. A fresh challenge and new App A/B login must return `CREDENTIAL_REVOKED`. An already-issued cookie session may remain valid until expiry; that does **not** indicate revocation failed. Test login with a fresh attempt, not by refreshing a page that still has a session.
4. **Wrong origin or gate.** Run `npm run production:acceptance` to verify distinct challenges for the two origins and HTTP 403 for an untrusted origin. In a real login, the result's `origin` must match the host that opened the popup. Gate/origin errors must return safe codes without a stack trace, secret, or wallet address.

After revocation, that credential must not be used for another successful demo login. To practice again, reenroll the holder account to create a new credential and revocation hash; verify the new root before login. Do not silently remove the old revocation.

## 5. Evidence package

Store dated, secret-free evidence in `frontend/docs/evidence/`:

- A 3–5 minute video: disclosure → gate → enrollment approval → two App A logins → one App B login → replay → revocation → privacy boundary.
- Root-update and revoke transaction links, matching contract ID, and epoch.
- Screenshots of the three login outcomes showing `A1 = A2` and `A1 ≠ B1`.
- A redacted HAR or host request/response table showing no wallet address. Redact proof, signatures, commitments, nullifiers, revocation hashes, cookies, challenges, authorization headers, IP addresses, and personal identifiers.
- Expiry result with creation/expiry times and error code, plus `GET /api/session` without a cookie.
- Local test output and the exact commit, deployment, and package versions.

Review each redacted file before committing or sharing. Never include a seed phrase, owner/issuer secret, `DATABASE_URL`, raw proof, or cookie in a public artifact.

## 6. Integration checklist for other developers

1. Read `/docs/quickstart`, `/docs/client`, `/docs/server`, `/docs/api`, `/docs/privacy`, and `/docs/threat-model`. `@veilpass/sdk` opens the popup, but the host **must** provide its own `POST /api/challenges` and `POST /api/verify` routes. The repository routes are examples; their names can differ if the SDK later supports route configuration.
2. Choose one exact HTTPS host origin, one login origin, a gate ID, and a Testnet contract. Allowlist the exact origin on the server; never trust an origin from the body/request header without checking deployment configuration.
3. Use durable storage with atomic challenge and nullifier consumption. Use the UltraHonk verifier with a pinned verification key and policy/root/epoch/revocation state from the contract. After `verifyVeilPassProof` succeeds, create a server session with an `HttpOnly`, `Secure`, `SameSite=Lax` cookie whose expiry does not exceed the proof expiry. Do not treat browser-provided values alone as authorization.
4. The host must not log `/api/verify` requests or persist proofs/public inputs. Store only the origin/epoch-scoped private app ID needed for the host's local account. Plan account migration if the epoch or credential changes.
5. Run `npm run pack:check` to verify package artifacts and run acceptance on the **integrator's own origin**. Check that the published npm package version matches the commit/deployment in use; local source changes do not update the public package. In the current version, the server package provides primitives; the host still supplies its database adapter, chain policy, and production verifier.
6. Preserve the product boundary: this is a Stellar Testnet MVP, not a mainnet/security audit or a network-anonymity solution. Before external developer release, require the live acceptance evidence above, a risk-appropriate security audit, a newly published package version, and a standalone integration example tested against the same deployment.

## 7. Acceptance worksheet

| Check | Publishable value/link | Status |
| --- | --- | --- |
| Matching commit and deployment | Source commit `acd0547` was merged to `master`; [CI run 36586446239](https://github.com/irham3/veilpass/actions/runs/36586446239) passed quality and browser jobs, and the Vercel deployment check succeeded. | Pass |
| Matching SDK/shared/server npm versions | Registry shows `0.2.2` for all three; `gitHead` matches tag `v0.2.2`, provenance is available, registry READMEs match source, clean CJS/ESM install/import passed, and GitHub Release archives match `SHA256SUMS`. | Pass |
| Health, environment validation, migration, matching root/tree | Production health returned 200; witness refresh and `/api/verify` succeeded with the Production root/credential; dashboard shows the gate owner. | Pass |
| Root-update transaction | [Testnet transaction](https://stellar.expert/explorer/testnet/tx/8e02e24c33b97f61b4b36e2c8f77b069c726a6d9df9a433d0c84647bb0dbb221); `root_updated` confirmed `premium-holder`, epoch `1`, root `21b4b45abc09035a6a01f5e3ecef9ef0f8dde0ae9d293f92bd59bdf5a831b940`. | Pass |
| App A `A1 = A2`; App B `B1 ≠ A1` | Tested in Chrome: App A succeeded 2/2 with a stable ID and App B succeeded 1/1 with a different ID; raw values were not recorded. | Pass |
| Redacted host capture with no wallet address | [App A request/response summary](host-network-capture-redacted-2026-09-29.md); raw HAR was not retained because it contains one-time proofs/identifiers. | Pass as redacted summary |
| Replay `CHALLENGE_SPENT` | A consumed App A proof was resubmitted; HTTP 400 `CHALLENGE_SPENT`. | Pass |
| Expiry `CREDENTIAL_EXPIRED` or `CHALLENGE_EXPIRED` | An unused proof was submitted after expiry according to the HTTP server; HTTP 400 `CREDENTIAL_EXPIRED`. | Pass |
| Revoke transaction and new-login `CREDENTIAL_REVOKED` | [Testnet transaction](https://stellar.expert/explorer/testnet/tx/4b59f5e6cea52484358184c77bbb5904afab9b2c8bb0fed3b9df9b75e056a6bf), `is_revoked=true`, fresh App A login returned `CREDENTIAL_REVOKED`. | Pass |
| Video and complete test/coverage report | 489/489 Vitest tests across 103 files; 107/107 executable JavaScript/TypeScript modules covered; full inventory at 100% statements (2,316/2,316), branches (1,626/1,626), functions (466/466), and lines (1,923/1,923). The [81-second English developer explainer](VeilPass_Developer_Explainer_EN_2026-09-30.mp4) covers the SDK, developer installation, and server verification boundaries. It is not live login or Freighter-approval footage. | Partial |

**Decision rule:** every row needs direct evidence before the demo can be called complete or ready for external developers. If a row is empty, it remains unverified even when unit tests pass.
