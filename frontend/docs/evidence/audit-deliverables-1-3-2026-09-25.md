# Historical Deliverables 1–3 audit

> **Archived on 30 September 2026.** This report records a point-in-time audit from 25 September 2026. Its findings and test counts predate later fixes, live acceptance, package publication, and the current coverage inventory. It is retained as historical context and is not the current release verdict.

## Audit scope

The audit compared the attached Statement of Work sections 4.1, 5.1, and 6.1 with the `master` checkout available on 25 September 2026. It reviewed the Soroban contract, Noir circuit, packages, application routes, storage, demo, docs, CI, public endpoints, and available test evidence. It did not approve a Freighter request or submit a revocation transaction during that audit.

## Historical conclusion

| Deliverable | Status on 25 September 2026 | Main evidence gap at that time |
| --- | --- | --- |
| 1 — Private Gate Core | Partial | Contract, circuit, and component tests existed, but one reproducible live sequence covering proof login, replay, expiry, and revocation was not yet recorded. |
| 2 — SDK and Hosted Login | Partial | SDK/server packages, hosted popup, Freighter enrollment, local proof, verifier, and sessions were implemented; live holder evidence and a redacted host network capture were not yet available. The audit also found documentation that overstated what data the host receives. |
| 3 — Two-dApp Demo and Docs | Partial | Public App A/App B routes and developer documentation existed, but the `/demo` page was a deterministic simulation and could not prove live wallet/proof behavior. The review video and network capture were missing at audit time. |

The audit therefore did not mark the SOW complete. Later work and acceptance results are recorded in the current links below; historical counts in this report must not be quoted as current.

## Historical test snapshot

The 25 September run reported 161/161 selected Vitest tests passing with 100% V8 coverage for the then-configured subset (546/546 statements, 403/403 branches, 120/120 functions, 432/432 lines). Rust contract tests passed 3/3, Noir checks passed 2/2, lint, typecheck, and build passed, and the corrected browser run passed 40/40. The public acceptance script failed on a stale `/demo` navigation expectation. The V8 denominator excluded routes and several server, proof, Rust, and Noir modules, so those percentages were not whole-repository coverage.

## Current authoritative evidence

- [Delivery status](delivery-status.md)
- [Test and coverage report](test-report.md)
- [Live acceptance checklist](live-acceptance-checklist.md)
- [Release v0.2.2 verification](release-v0.2.2-verification-2026-09-29.md)
- [End-to-end demo and developer release guide](demo-end-to-end-guide-2026-09-25.md)
- [English developer explainer](VeilPass_Developer_Explainer_EN_2026-09-30.mp4) (product overview; not live wallet-approval evidence)

The full historical audit text remains in Git history. Use the current evidence pages for deployment, package, test, and acceptance decisions.
