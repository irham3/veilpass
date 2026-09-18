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

## Coverage gate

`npm run test:coverage` measures the security-critical TypeScript core and requires complete coverage:

- statements: 100%
- branches: 100%
- functions: 100%
- lines: 100%

The generated HTML and LCOV reports live under `coverage/`. CI uploads that directory on every run. PostgreSQL adapters and Soroban RPC execution are explicitly marked as integration boundaries in coverage; their production paths are exercised by the integration, security, and contract smoke suites without pretending a local unit mock proves a live database or Testnet deployment.

The current verified baseline is 32 Vitest files with 130 passing tests and 32 Playwright scenarios across desktop and mobile. Update this line whenever tests are added or removed.

## Local release check

Run the same high-signal checks used by CI:

```bash
npm run lint
npm run typecheck
npm run test:coverage
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
