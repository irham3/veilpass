# Pricing — VeilPass

VeilPass is currently an MVP and testnet demo.

## Testnet MVP

- Price: $0/month
- Network: Stellar Testnet
- Wallet: Freighter
- Included: public landing page and developer docs, two-origin demo, Freighter Testnet enrollment, Soroban gate-registry source and Testnet deployment, published SDK/server/shared integration primitives, and test-oriented scripts
- Limits: no paid plan or SLA; no mainnet deployment; no managed customer dashboard; host applications must build their own challenge/verification API routes, durable storage, pinned proof verifier, policy adapter, and user session
- Best for: reviewers, hackathon judges, testnet experimentation, and developers evaluating the privacy boundary

## Production

- Price: not yet published
- Status: not available in this MVP
- Availability: no production/mainnet offering or commercial commitment is available
- Requirements before any broader production offering: reviewed and reproducible release artifacts, service isolation and SLOs, operational monitoring, managed key controls, abuse controls, privacy/security review, and mainnet policy review

## Important privacy note

VeilPass does not claim anonymity. The issuer sees the wallet address during enrollment. A host's `POST /api/verify` backend receives the raw proof and public inputs transiently; those values are sensitive and must not be logged or persisted. The success result contains a scoped private app ID and eligibility verdict, not the Stellar wallet address. IP address, browser/device fingerprint, timing, and later on-chain activity are not hidden.
