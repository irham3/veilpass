# Changelog

Notable changes to VeilPass are recorded here. Version entries describe source intended for the release tag; a package becomes publicly available only after the protected tag workflow publishes it.

## [0.2.1] - 2026-09-26

### Changed

- Expanded the GitHub README, hosted developer guides, `llms.txt`, pricing page, and package-root READMEs with the exact host/login trust boundaries, API ownership, setup prerequisites, privacy limits, error behavior, package exports, and production integration requirements.
- Added package-specific npm homepage and keyword metadata for the public SDK, server, and shared packages.
- Added `npm run docs:check` and a CI gate comparing implemented API methods/routes, public privacy claims, package README coverage, and package export metadata.
- Documented that the SDK requires host-owned `POST /api/challenges` and `POST /api/verify` routes, and that the server package is a verifier primitive rather than a turnkey backend.
- Clarified the safe Vercel deploy working directory and the additional owner/database/root setup required after generating a local env template.

### Fixed

- Corrected public docs that implied proof, commitment, nullifier, or revocation inputs were never received by a host. The wallet address remains excluded, while proof inputs are identified as sensitive transient data that must not be logged or persisted.
- Corrected the landing FAQ deployment instructions and clarified the per-credential revocation callback requirement in server integrations.
- Improved mobile E2E selectors for the documentation sidebar and aligned landing FAQ tests with the corrected copy.

### Security and runtime

- The server verifier accepts bounded client/server clock skew while keeping credential expiry and the server-issued challenge expiry enforced.
- The browser SDK suppresses duplicate proof messages while an in-flight verification is consuming the one-time challenge.

### Release status

- `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server` version `0.2.1` were published on 27 September 2026 from the protected `v0.2.1` tag with npm provenance.
- The [GitHub Release](https://github.com/irham3/veilpass/releases/tag/v0.2.1) contains all three package archives and verified SHA256 checksums. See the [release verification](frontend/docs/evidence/release-v0.2.1-verification-2026-09-27.md).
- The hosted website and GitHub developer documentation were updated from the reviewed source before the package release.

## [0.2.0] - 2026-09-26

- Initial public npm release of `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server`.
- The publication was performed manually without provenance; see the [release evidence](frontend/docs/evidence/delivery-status.md).
