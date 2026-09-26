# VeilPass `v0.2.1` release verification — 27 September 2026

## Source and workflow

- Immutable tag: [`v0.2.1`](https://github.com/irham3/veilpass/tree/v0.2.1) at `3edf8974df9656a44a4361868b33dd3794d19ad1`.
- [Release packages workflow, attempt 2](https://github.com/irham3/veilpass/actions/runs/36215791259/attempts/2) completed successfully after the npm package owner authorized the GitHub Actions Trusted Publisher. The workflow passed `pack:check`, published all three packages with provenance, generated package archives and `SHA256SUMS`, and created the [GitHub Release](https://github.com/irham3/veilpass/releases/tag/v0.2.1).
- This release publishes the tagged package sources. The later `master` commits add tests and evidence documentation; they do not change the shared, SDK, or server package implementation from the tag.

## Public npm registry

| Package | Published version | Registry SHA-1 `dist.shasum` | Provenance |
| --- | --- | --- | --- |
| [@veilpass/shared](https://www.npmjs.com/package/@veilpass/shared) | `0.2.1` | `7a50e49d804b4ebda2e3e28b3f1a5f4e1ac36208` | [npm attestation](https://registry.npmjs.org/-/npm/v1/attestations/@veilpass%2fshared@0.2.1) |
| [@veilpass/sdk](https://www.npmjs.com/package/@veilpass/sdk) | `0.2.1` | `99055bca8bcf569272353037afe101621ffbca05` | [npm attestation](https://registry.npmjs.org/-/npm/v1/attestations/@veilpass%2fsdk@0.2.1) |
| [@veilpass/server](https://www.npmjs.com/package/@veilpass/server) | `0.2.1` | `54dd931bdc84d0a15ba3af9b19315ec600e9e774` | [npm attestation](https://registry.npmjs.org/-/npm/v1/attestations/@veilpass%2fserver@0.2.1) |

All three registry manifests report `gitHead` equal to the tagged commit and `dist.attestations.provenance.predicateType` equal to `https://slsa.dev/provenance/v1`. The workflow log records a signed provenance statement for each package. The package READMEs are included in the published tarballs (shared 6.8 kB, SDK 9.1 kB, server 9.6 kB).

A clean install from `registry.npmjs.org` of the three exact `0.2.1` versions succeeded. Node imported each published package through both CommonJS and ESM entry points: shared exposed 19 exports, SDK 2, and server 1 in each module format. npm verified registry tarball integrity during installation. This is an import smoke test; it does not exercise every application flow.

## GitHub Release archives

The release contains `veilpass-shared-0.2.1.tgz`, `veilpass-sdk-0.2.1.tgz`, `veilpass-server-0.2.1.tgz`, and `SHA256SUMS`. Each downloaded archive matched the published checksum file:

| Archive | Verified SHA-256 |
| --- | --- |
| `veilpass-shared-0.2.1.tgz` | `28aeae960a5ea50300f5e3a0ee4c9c3ade6a0143d59f8b5b8a333f8b42644735` |
| `veilpass-sdk-0.2.1.tgz` | `5adfe0fc37b060ab15e0198f705f87c046f8ecb83b5ca2459551d1673c55315d` |
| `veilpass-server-0.2.1.tgz` | `2916b8c6b33978ffeadcc1a82ab41a63562c30e446421cd6f4974eeb0131c257` |

## Remaining product acceptance

The release publication and package documentation gate are complete. The broader demo acceptance still requires live replay, expiry, and revocation checks, a redacted host request capture, and a review video. Whole-source Vitest coverage has a statement hit in every executable module but remains below 100% by aggregate statements, branches, functions, and lines; see the [test report](test-report.md) and [demo guide](demo-end-to-end-guide-2026-09-25.md).
