# VeilPass proof package

The production boundary is the Noir membership circuit under `circuits/membership`. It binds credential membership, gate epoch, normalized origin, challenge, expiry, private app ID, login nullifier, and revocation hash to one subject secret.

The checked-in TypeScript `simulated.ts` adapter is only a deterministic integration fixture. It is forgeable and must never be presented as a zero-knowledge proof.

## Reproducible circuit check

The checked-in circuit is pinned to the official compatible pair Nargo `1.0.0-beta.22` and Barretenberg `5.0.0-nightly.20260522`. From `frontend`, run:

```sh
npm run proof:check
```

On Windows the command delegates to WSL; on Linux CI it invokes the native binaries directly. The helper validates both versions, runs the valid-membership circuit test, produces a witness from the checked-in **synthetic** fixture, generates an UltraHonk proof, and verifies the proof against the generated verification key. An accidental compiler or backend upgrade therefore cannot silently change the circuit or proof serialization.

The backend binary and generated proof material are intentionally not committed to this repository. Use `scripts/install-noir-toolchain.sh` inside WSL/Linux to install the pinned pair.

`simulated.ts` remains an integration fixture only. The application rejects it whenever `NODE_ENV=production`, even when a simulator key is mistakenly configured.
