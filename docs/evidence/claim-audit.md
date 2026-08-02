# Privacy claim audit

Approved claim: VeilPass prevents a host dApp from receiving the user's Stellar wallet address during a VeilPass login and returns an origin-and-gate-scoped private ID.

Audit results:

- No positive claim of anonymity, untraceability, complete privacy, trustless identity, or category-first status appears in product surfaces.
- The one use of `anonymous` is a negative warning that a private app ID is not anonymous.
- Enrollment explicitly says the issuer sees the Stellar address and checks the public Testnet balance.
- Landing, demo, login, docs, and README state that IP address, browser fingerprint, timing, device state, or later on-chain activity remain outside the boundary.
- Every simulated cryptographic surface is labeled `Simulated proof` and says it is forgeable and not a zero-knowledge proof.
- Verified host success is schema-limited to `privateAppId`, `gateId`, `epoch`, `origin`, and `expiresAt` plus `ok`.
