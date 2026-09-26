# `@veilpass/contract-bindings`

Generated TypeScript client for the VeilPass Soroban gate registry contract. It exposes the contract's typed method builders and the relevant Stellar SDK exports. This package is generated from the repository contract; it does **not** deploy the contract, manage keys, publish credential roots automatically, or implement the VeilPass login proof verifier.

> **Network and status:** workspace metadata version `0.1.0`; the repository's current VeilPass deployment is on Stellar **Testnet**. This package is generated source in the monorepo and is not included in the protected npm release workflow for `@veilpass/shared`, `@veilpass/sdk`, and `@veilpass/server`. Do not assume a public `@veilpass/contract-bindings` npm release exists.

## Install from this repository

The supported workflow is to build and import the workspace package from the VeilPass monorepo. It is not a standalone published package at this time.

```sh
cd frontend
npm ci
npm run packages:build
```

```ts
import { Client } from "@veilpass/contract-bindings";
```

The generated `Client` receives normal Soroban `ContractClientOptions` (including a contract ID, RPC URL, and network passphrase). Use the official Stellar SDK documentation for RPC, signing, and transaction submission settings; this generated wrapper exports no `networks.futurenet`/`networks.testnet` helper.

## Contract operations

The current binding methods are:

| Method | Access | Purpose |
| --- | --- | --- |
| `get_gate` | Read | Read root, epoch, owner, policy hash, and update time |
| `is_revoked` | Read | Query whether a credential revocation hash is registered |
| `create_gate` | Owner transaction | Initialize a gate with policy hash and root |
| `update_root` | Owner transaction | Update the root only at the expected epoch |
| `rotate_epoch` | Owner transaction | Advance epoch and install a replacement root |
| `revoke` | Owner transaction | Revoke a credential hash for a gate |

Generated write methods build and simulate an `AssembledTransaction`; a state change occurs only after a transaction is signed and sent. Do not expose the owner secret in browser code, source control, package examples, build logs, or client-side environment variables. Keep owner operations in a restricted operator service and verify the network, contract, gate, current epoch, and proposed values before signing.

Root updates, epoch rotation, and revocation can affect existing credential login. Routine VeilPass login is off-chain; it does not require a contract transaction. The contract registry stores public state only and does not contain wallet private keys or the credential secret.

## Source of truth and regeneration

The source contract and deployment procedure live in [`contracts/veilpass-gate`](https://github.com/irham3/veilpass/tree/master/contracts/veilpass-gate). The binding source is generated into `frontend/packages/contract-bindings/src/` and built to `dist/`:

```sh
cd frontend
npm run contract:test
npm run packages:build
npm run pack:check
```

After changing the Rust contract, regenerate the client with the Soroban CLI version pinned by the project release process, inspect the generated diff, and run contract tests, binding build, and package checks. Never copy the generic `INSERT_*` command from an upstream template: binding generation options are version-specific and the contract ID/network must come from the intended deployment.

See the [contract operations guide](https://veilpass.dev/docs/contract), [deployment evidence](https://github.com/irham3/veilpass/blob/master/frontend/docs/evidence/contract.md), and [release workflow](https://github.com/irham3/veilpass/blob/master/.github/workflows/release-packages.yml). MIT license: [`LICENSE`](https://github.com/irham3/veilpass/blob/master/LICENSE).
