# Historical Deliverables 1–5 audit

> **Archived on 30 September 2026.** This is a point-in-time audit from 10 September 2026. Contract roots, package versions, deployment state, test results, and operator actions have since changed. Do not use the values or procedures from this snapshot on a current deployment.

## Scope and historical finding

The report assessed the VeilPass Statement of Work against the repository as it stood on 10 September 2026. It covered the Soroban gate, eligibility policy, domain-bound circuit, private identifiers and nullifiers, SDK and hosted login, Freighter enrollment, two-host demo, operator dashboard, documentation, tests, and evidence requirements.

At that time, repository changes had addressed portability, a domain-separation circuit test, runtime configuration validation, and a health endpoint. Live database configuration, owner-signed root updates, wallet enrollment, public-origin acceptance, and review evidence still required operator access. Those findings are historical and do not describe the current release state.

## Historical evidence preserved by the audit

The original audit documented a detailed acceptance plan for:

- Durable PostgreSQL state and migrations for challenges, sessions, credentials, and Merkle data.
- Matching off-chain credential-tree roots with the Soroban contract and recovering safely from root-publication failures.
- Holder enrollment and asset eligibility through Freighter.
- Separate HTTPS origins for hosted login, App A, and App B.
- Valid login, repeat login stability, cross-origin separation, replay, expiry, revocation, and stale-epoch rejection.
- Package verification, automated quality gates, redacted network captures, transaction links, and a review video.

The source plan and its point-in-time commands remain in Git history. They are not current operator instructions.

## Current authoritative evidence

- [Current delivery status](delivery-status.md)
- [Current test and coverage report](test-report.md)
- [Live acceptance checklist](live-acceptance-checklist.md)
- [Release v0.2.2 verification](release-v0.2.2-verification-2026-09-29.md)
- [Current demo and developer release guide](demo-end-to-end-guide-2026-09-25.md)
- [Current English developer explainer](VeilPass_Developer_Explainer_EN_2026-09-30.mp4) (product overview; not live wallet-approval evidence)

For current operator setup, use the current quickstart and demo guide. Never copy historic root values, deployment IDs, environment settings, package versions, or commands from this archived audit into a live environment.
