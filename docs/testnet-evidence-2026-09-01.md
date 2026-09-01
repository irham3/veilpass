# Stellar Testnet evidence — 1 September 2026

The read-only smoke check was rerun against the deployed VeilPass Soroban contract using the Stellar CLI `26.0.0` and Testnet network configuration.

| Check | Result |
| --- | --- |
| Contract ID | `CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY` |
| Gate | `premium-holder` |
| Gate epoch | `1` |
| Credential root | `853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc` |
| Owner | `GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM` |
| Zero revocation fixture | `false` (not revoked) |

The smoke script uses `--send no` because `get_gate` and `is_revoked` are read-only queries. This prevents the CLI from attempting to sign a transaction with a public source address and makes the script appropriate for repeatable evidence collection:

```sh
cd frontend
npm run contract:smoke
```

Write operations (create, rotate epoch, update root, revoke) deliberately require the owner identity and testnet funds. They are not executed by the smoke check because invoking them would mutate the shared testnet gate state.
