# Proof evidence

- Membership circuit: `packages/proof/circuits/membership/src/main.nr`
- Pinned toolchain: Nargo `1.0.0-beta.22`, Barretenberg `5.0.0-nightly.20260522`
- Browser artifact: `public/proof/veilpass_membership.json`
- Pinned verification key: `public/proof/veilpass_membership.vk`
- Integrity manifest: `public/proof/manifest.json`
- Runtime check: `npm run proof:runtime` executes NoirJS, produces an UltraHonk proof with 11 public inputs, and verifies it with the committed VK.

The proof binds the credential commitment and Merkle witness, gate/epoch/root, origin, fresh challenge, expiry, domain-scoped private app ID, login nullifier, and issuer-controlled revocation hash. The hosted page generates the proof locally; the verifier checks the proof/VK pair and returns only the minimized host result. `/api/proof/simulate` is an isolated non-production compatibility fixture and is not accepted by `/api/verify`.
