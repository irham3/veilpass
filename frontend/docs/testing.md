# VeilPass test strategy

VeilPass uses a layered test model so each boundary is checked at the cheapest reliable level and the deployed browser behavior is still exercised end to end.

## Test layers

| Layer | Tool | Scope | Command |
| --- | --- | --- | --- |
| Unit | Vitest, Testing Library | Pure contracts, field encoding, state machines, stores, SDK channel validation, UI interaction and semantics | `npm run test:unit` |
| Integration | Vitest with real Next `Request`/`Response` objects | API origin validation, strict schemas, cache policy, health response minimization, body limits | `npm run test:integration` |
| System | Playwright on Chromium desktop and Pixel 7 emulation | Landing, two-origin flow, replay, revocation, responsive overflow, keyboard focus, reduced motion, install metadata | `npm run test:system` |
| Accessibility | Playwright plus axe-core | Landing, demo, dashboard and docs; serious and critical findings fail the build | `npm run test:a11y` |
| Security | Vitest, Playwright, npm audit | CSP, security headers, cross-origin rejection, oversized/hostile input, session minimization, secret leakage, dependency advisories | `npm run test:security` |
| Contract | Cargo and Stellar smoke scripts | Soroban contract behavior and optional live Testnet deployment | `npm run contract:test`, `npm run contract:smoke` |
| Documentation contract | Vitest | Every implemented API method/path appears in the hosted developer docs and GitHub README; privacy and package README/export metadata remain explicit | `npm run docs:check` |

The Playwright system job requires the production app's challenge API to use durable storage. CI provisions a disposable PostgreSQL 17 service, applies the repository migrations, and passes its connection string only to that job. It does not connect to a developer's or production database.

## Coverage gate

`npm run test:coverage` measures the selected security-critical TypeScript core and requires complete coverage of that selection:

- statements: 100%
- branches: 100%
- functions: 100%
- lines: 100%

The generated HTML and LCOV reports live under `coverage/`. CI uploads that directory on every run. **This is not whole-project coverage.** The selection excludes much of the App Router, browser UI, PostgreSQL adapters, proof browser worker, scripts, Rust, and Noir.

`npm run test:coverage:all` measures all first-party application, component, library, package-source, script, and runtime-config TypeScript/TSX/MJS modules with Vitest V8. It includes files that received zero Vitest execution. CI uploads `coverage-all/` separately. Browser Playwright tests exercise UI and route behavior but their browser/server execution is **not merged** into this V8 percentage; Rust and Noir require their own coverage tools. A green full-inventory command means tests passed and a report was generated, not that 100% was reached. The dated [test report](evidence/test-report.md) records the actual figures and gaps.

Verified on 26 September 2026: 87 Vitest files, 279 passing tests; selected core 100% of 580 statements, 424 branches, 123 functions, and 479 lines; broad V8 inventory 77.16% statements, 75.14% branches, 79.10% functions, and 79.51% lines; 48/48 Playwright desktop/mobile scenarios. The core selection is fully covered; the whole TypeScript inventory is not 100%, as itemized in the dated [test report](evidence/test-report.md). Re-run commands for the current commit before release.

## Reproducing the browser job locally

`npm run test:system` starts a production Next.js server. In production mode the challenge API intentionally fails closed with HTTP 503 if durable storage is missing, so point it at an isolated local PostgreSQL database—not a production or shared developer database—and apply migrations first:

```bash
docker compose -f compose.e2e.yml up -d --wait
export DATABASE_URL='postgresql://veilpass:veilpass@localhost:55432/veilpass'
npm run db:migrate
npm run test:system
docker compose -f compose.e2e.yml down --remove-orphans
```

On PowerShell, start the Compose service, set `$env:DATABASE_URL` to the same local-only connection string, run the two npm commands, then stop the disposable database with `docker compose -f compose.e2e.yml down --remove-orphans`. The Compose service has no persistent volume, so removing the container removes its test data. The GitHub Actions browser job provisions its own PostgreSQL service and database. CI uses two Playwright workers to keep Chromium memory use within the hosted runner budget; local defaults can use the available machine resources.

## Local release check

Run the same high-signal checks used by CI:

```bash
npm run lint
npm run typecheck
npm run docs:check
npm run test:coverage
npm run test:coverage:all
npm run test:system
npm run test:security:deps
npm run build
```

`npm run test:ci` combines the JavaScript/TypeScript checks. Contract and proof-toolchain checks stay separate because they require Rust, Noir, Barretenberg, and for the live smoke test, explicit Testnet configuration.

## Security expectations

- Tests must use strict schemas and assert rejection of unknown fields.
- Error assertions must also check that stack traces, database details, tokens, wallet addresses, and secrets are absent.
- Origin tests must include a known-good exact origin and at least one attacker-controlled origin.
- Authentication or session changes require cookie flag and expiry coverage.
- Any new animation must be checked under reduced motion.
- Any new top-level route must be added to the axe route table or have a documented exception.
- New runtime dependencies must keep `npm run test:security:deps` green.
