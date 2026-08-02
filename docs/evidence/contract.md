# Contract evidence

- Network target: Stellar Testnet
- Soroban SDK: `26.1.1` (exactly pinned)
- Local Wasm SHA-256: `735c8d2e38c17d28606d6f696dc7e802f545ac9bd013ed53a05f4a49f67f13d8`
- Wasm size: 7,027 bytes
- Exported operations: `create_gate`, `update_root`, `rotate_epoch`, `revoke`, `get_gate`, `is_revoked`
- Local Rust tests: 3 passing
- Testnet contract ID: not deployed; a funded Stellar testnet identity is required

Run `contracts/veilpass-gate/scripts/deploy-testnet.ps1` with a configured identity, then record the contract ID and transaction links here.
