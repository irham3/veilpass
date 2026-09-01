# VeilPass proof package

The production boundary is the Noir membership circuit under `circuits/membership`. It binds credential membership, gate epoch, normalized origin, challenge, expiry, private app ID, login nullifier, and revocation hash to one subject secret.

The checked-in TypeScript `simulated.ts` adapter is only a deterministic integration fixture. It is forgeable and must never be presented as a zero-knowledge proof.

## Reproducible circuit check

The checked-in circuit compiles with Nargo `1.0.0-beta.26`. From `frontend`, run:

```sh
npm run proof:check
```

On Windows the command delegates to WSL; on Linux CI it invokes Nargo directly. The helper validates the installed compiler version before compiling, so an accidental compiler upgrade cannot silently change the circuit.

Proof generation and verification additionally need the matching Barretenberg `bb` backend. The backend is intentionally not committed to this repository. Install it through `bbup` in WSL or your CI image, record its exact version in the release evidence, and run a proof/verification fixture before changing the proof mode to `noir`.

`simulated.ts` remains an integration fixture only. The application rejects it whenever `NODE_ENV=production`, even when a simulator key is mistakenly configured.
