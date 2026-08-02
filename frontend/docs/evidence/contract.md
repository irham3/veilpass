# Contract evidence

- Network target: Stellar Testnet
- Soroban SDK: `26.1.1` (exactly pinned)
- Local Wasm SHA-256: `735c8d2e38c17d28606d6f696dc7e802f545ac9bd013ed53a05f4a49f67f13d8`
- Wasm size: 7,027 bytes
- Exported operations: `create_gate`, `update_root`, `rotate_epoch`, `revoke`, `get_gate`, `is_revoked`
- Local Rust tests: 3 passing
- Testnet contract ID: `CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY`
- Testnet admin/source: `GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM`
- Gate ID: `premium-holder`
- Gate epoch: `1`
- Policy hash: `824a57f759b435e5e7f300f65dad132ff8039fa83805f19a2169893319eea0d7`
- Credential root: `853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc`
- Upload transaction: `7f36ff2806de44f1eda474a8d2bad0af996c3e01470447f94285a2ab6114cf7f`
- Deploy transaction: `4e3130466c76b07e5fbe6cf91ebdca12c76dca415a7a5fc4757496f6b61803b8`
- Gate initialization transaction: `727029573e81c9c2616d3b2ada1b688648e953e606e8c11d1f8cb95cc4c41e54`

Verify the live gate:

```powershell
npm run contract:smoke
```
