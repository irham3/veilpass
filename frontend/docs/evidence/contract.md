# Contract evidence

- Network target: Stellar Testnet
- Soroban SDK: `26.1.1` (exactly pinned)
- Local Wasm SHA-256: `735c8d2e38c17d28606d6f696dc7e802f545ac9bd013ed53a05f4a49f67f13d8`
- Wasm size: 7,027 bytes
- Exported operations: `create_gate`, `update_root`, `rotate_epoch`, `revoke`, `get_gate`, `is_revoked`
- Local Rust tests: 3 passing
- Testnet contract ID: `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`
- Testnet admin/source: `GDVP7QVOCQ4L4CDNXVWD53ATXGYDXTDOYVFPJ3UA5OTWJW7XGXSNFXRJ`
- Gate ID: `premium-holder`
- Gate epoch: `1`
- Policy hash: `824a57f759b435e5e7f300f65dad132ff8039fa83805f19a2169893319eea0d7`
- Credential root (latest read-only smoke, 29 September 2026): `2599dffae45935bcfafde7039c4ebc1bf2bffb22b24b4089deedcccf2c9e2770`, epoch `1`. The root changes after issuance; rerun the smoke check before relying on it.
- Wasm installation: reused the verified local Wasm hash; no new upload transaction was required for this deployment.
- Deploy transaction: `ebefe9c2aa18361e58dc1defac11fe346840d62efee2b3c4ac0c35c3544af3cb`
- Gate initialization transaction: `c7b420f20f0167c47340259f7afb060040ac06b9f40303163ae2da8c79620558`

The deploy and initialization transactions above establish the contract and its initial empty root. The [29 September update-root transaction](https://stellar.expert/explorer/testnet/tx/ab2cb1f74c9595f03a4cda4b63299720f467d602db22cd2819bebaec82ea526c) emitted `root_updated` for `premium-holder`; decoding the event confirms epoch `1` and the root recorded above. Production witness refresh and proof verification also succeeded against this enrolled credential, confirming the deployed login can use the published root. The later [revocation transaction](https://stellar.expert/explorer/testnet/tx/c3e8eb3855eeca0b99cd9912f020a668ef516a67313edf1459fe4620200cf261) was confirmed by a fresh `is_revoked=true` read.

Verify the live gate:

```powershell
npm run contract:smoke
```
