# VeilPass `v0.2.2` release verification — 29 September 2026

## Release identity

- Tag: [`v0.2.2`](https://github.com/irham3/veilpass/tree/v0.2.2)
- Tagged commit: `1cb3a3d09ebdd2fc648725b34110a4e66397a381`
- [Release workflow run 36549380349](https://github.com/irham3/veilpass/actions/runs/36549380349): completed successfully.
- [GitHub Release](https://github.com/irham3/veilpass/releases/tag/v0.2.2): contains package tarballs and `SHA256SUMS`.
- [Master CI run 36548757050](https://github.com/irham3/veilpass/actions/runs/36548757050): quality/build and browser/accessibility jobs passed before tagging.

This patch release refreshes public package documentation. The runtime APIs remain compatible with `0.2.1`.

## npm registry

All three packages now publish `0.2.2` as `latest`, use the tagged source commit, and have npm provenance attestations. Each registry-rendered README was compared with the tagged package README; all three matched exactly after line-ending normalization.

| Package | Version | `gitHead` | npm provenance |
| --- | --- | --- | --- |
| [`@veilpass/shared`](https://www.npmjs.com/package/@veilpass/shared) | `0.2.2` | `1cb3a3d09ebdd2fc648725b34110a4e66397a381` | [Attestation](https://registry.npmjs.org/-/npm/v1/attestations/%40veilpass%2fshared@0.2.2) |
| [`@veilpass/sdk`](https://www.npmjs.com/package/@veilpass/sdk) | `0.2.2` | `1cb3a3d09ebdd2fc648725b34110a4e66397a381` | [Attestation](https://registry.npmjs.org/-/npm/v1/attestations/%40veilpass%2fsdk@0.2.2) |
| [`@veilpass/server`](https://www.npmjs.com/package/@veilpass/server) | `0.2.2` | `1cb3a3d09ebdd2fc648725b34110a4e66397a381` | [Attestation](https://registry.npmjs.org/-/npm/v1/attestations/%40veilpass%2fserver@0.2.2) |

An isolated temporary consumer installed the three exact `0.2.2` versions from npm. Shared, SDK, and Server imported successfully from both CommonJS and ESM.

## GitHub release archive checksums

The downloaded GitHub Release assets matched `SHA256SUMS`:

| Archive | SHA-256 |
| --- | --- |
| `veilpass-sdk-0.2.2.tgz` | `8584d456a7c549c22491869705f7241c96f6072c4637d6a5918cb2a77e0f1208` |
| `veilpass-server-0.2.2.tgz` | `4dd3767309373ff880bdef942ff79cfc9eb1d97f9beeb6ba6807571378fd0772` |
| `veilpass-shared-0.2.2.tgz` | `a2210a05f6677fb6b11611c9ebd52385f1202c3220dcd50d10b845b92242a10d` |

## Scope and limits

This verifies the package release artifacts, published README parity, provenance presence, archive integrity, and Node.js module-format imports. It does not claim that package consumers have provisioned host API routes, persistent storage, a cryptographic verifier, chain policy, or sessions; see each package README and the [two-origin example project](../../examples/two-origin-dapp/README.md).
