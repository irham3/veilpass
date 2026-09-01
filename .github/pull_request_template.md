## Summary

Describe the user-visible change and the deliverable it advances.

## Scope

- [ ] Privacy/proof boundary
- [ ] Soroban contract or Testnet operations
- [ ] SDK, server package, or npm publishing
- [ ] App A/App B host integration
- [ ] UI, accessibility, or motion
- [ ] Documentation/evidence only

## Verification

- [ ] `npm run lint` (from `frontend/`)
- [ ] `npm run typecheck` (from `frontend/`)
- [ ] `npm test` (from `frontend/`)
- [ ] `npm run contract:test` (from `frontend/`)
- [ ] `npm run build` (from `frontend/`)
- [ ] Relevant Playwright test(s)
- [ ] `npm run pack:check` if an npm package changed

## Privacy and security checklist

- [ ] No host response, browser storage, log, screenshot, fixture, or documentation exposes a Stellar wallet address.
- [ ] Any proof claim matches the active implementation; simulation is labelled as simulation.
- [ ] Exact-origin, expiry, replay/nullifier, and revocation behavior were considered where applicable.
- [ ] Secrets, signer identities, and `.env.local` are not included.

## Evidence

Link test output, Testnet transaction/event evidence, screenshots, or recordings. Explain explicitly if live wallet, database, or Testnet verification remains unavailable.

## Release notes

- [ ] No release required
- [ ] Add/change a changeset or package version before merging

