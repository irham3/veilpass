# VeilPass

VeilPass is a Stellar Testnet MVP for origin-scoped, eligibility-gated login. A host dApp receives a verified private app ID and policy verdict without receiving the user's Stellar wallet address.

This is not an anonymity system. The enrollment issuer sees the wallet address. IP address, browser fingerprint, timing, device state, and later on-chain activity remain outside the MVP privacy boundary.

## Included

- bespoke Private Aperture landing page;
- controlled App A/App B demo with stable same-origin IDs, cross-origin separation, replay rejection, and revocation rejection;
- host SDK popup channel with exact `origin`, `source`, and state checks;
- 32-byte, five-minute, digest-only challenges with atomic PostgreSQL consumption;
- minimized verifier response and opaque HTTP-only session adapter;
- Freighter Testnet enrollment, Horizon asset eligibility, signed issuer credentials, and IndexedDB subject-secret storage;
- Soroban gate registry, generated TypeScript binding, deployment/restore scripts, and live dashboard reads/writes;
- deterministic integration proof adapter labeled `Simulated proof` plus the Noir circuit boundary;
- developer docs, browser tests, accessibility checks, CSP, and evidence artifacts.

## Local development

Requirements: Node.js 20 or later, npm, Rust/Cargo, and Stellar CLI 26 or later.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The landing page, docs, fixture demo, and dashboard setup state run without credentials. Live enrollment and contract flows stay disabled until the values in `.env.local` are configured.

## Production configuration

Set exact host and login origins, a PostgreSQL `DATABASE_URL`, a unique simulator key for the visibly simulated integration mode, an issuer Stellar secret, the exact asset rule, a deployed contract ID, RPC URL, and a funded public source account. Apply the database migration:

```powershell
npm run db:migrate
```

Production challenge and verification endpoints fail closed without PostgreSQL. Never prefix issuer or simulator secrets with `NEXT_PUBLIC_`.

## Contract

```powershell
npm run contract:test
stellar contract build --manifest-path contracts/veilpass-gate/Cargo.toml --locked
contracts/veilpass-gate/scripts/deploy-testnet.ps1 -Identity <stellar-cli-identity>
```

The checked-in Wasm SHA-256 is recorded in `docs/evidence/contract.md`. Deployment requires a funded Stellar Testnet identity and creates real testnet transactions.

## Proof toolchain

`packages/proof/circuits/membership` contains the Noir source. The deterministic TypeScript adapter is not a zero-knowledge proof. The official Noir/Barretenberg toolchain does not provide native Windows binaries, so use WSL with Nargo `1.0.0-beta.23` and a compatible Barretenberg backend:

```bash
cd packages/proof/circuits/membership
nargo test
nargo compile
```

Replace `UnavailableNoirAdapter` only after committing the compiled artifact and verification key and rerunning the full proof matrix.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run contract:test
npm run test:e2e
npm run test:a11y
npm run build
npm audit --omit=dev
```

See `docs/evidence` for the local results, visual captures, contract hash, and remaining external setup.
