# VeilPass proof package

The production boundary is the Noir membership circuit under `circuits/membership`. It binds credential membership, gate epoch, normalized origin, challenge, expiry, private app ID, login nullifier, and revocation hash to one subject secret.

The checked-in TypeScript `simulated.ts` adapter is only a deterministic integration fixture. It is forgeable and must never be presented as a zero-knowledge proof.

Toolchain target: Nargo `1.0.0-beta.23` and a compatible Barretenberg backend. On Windows, the official toolchain requires WSL. Run `nargo test` from `packages/proof/circuits/membership` after installing that toolchain.
