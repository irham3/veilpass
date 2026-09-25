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

`npm run test:coverage` measures the selected security-critical TypeScript core and requires complete coverage of that selection:

- statements: 100%
- branches: 100%
- functions: 100%
- lines: 100%

The generated HTML and LCOV reports live under `coverage/`. CI uploads that directory on every run. **This is not whole-project coverage.** The selection excludes much of the App Router, browser UI, PostgreSQL adapters, proof browser worker, scripts, Rust, and Noir.

`npm run test:coverage:all` measures all first-party application, component, library, package-source, script, and runtime-config TypeScript/TSX/MJS modules with Vitest V8. It includes files that received zero Vitest execution. CI uploads `coverage-all/` separately. Browser Playwright tests exercise UI and route behavior but their browser/server execution is **not merged** into this V8 percentage; Rust and Noir require their own coverage tools. A green full-inventory command means tests passed and a report was generated, not that 100% was reached. The dated [test report](evidence/test-report.md) records the actual figures and gaps.

Verified on 25 September 2026 before the final config inventory expansion: 39 Vitest files, 164 passing tests; selected core 100% of 546 statements; broad V8 inventory 35.23% statements, 34.89% branches, 32.20% functions, 34.80% lines; 44/44 Playwright desktop/mobile scenarios. Re-run commands for the current commit before release.

## Local release check

Run the same high-signal checks used by CI:

```bash
npm run lint
npm run typecheck
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
