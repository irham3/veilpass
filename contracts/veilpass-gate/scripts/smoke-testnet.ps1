param(
  [string]$ContractId = "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY",
  [string]$Source = "GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM",
  [string]$GateId = "premium-holder",
  [string]$RevocationHash = "0000000000000000000000000000000000000000000000000000000000000000"
)
$ErrorActionPreference = "Stop"

Write-Output "Reading VeilPass gate from Stellar Testnet..."
stellar contract invoke --id $ContractId --source-account $Source --network testnet --send no -- get_gate --gate_id $GateId

Write-Output "Checking a non-revoked fixture hash..."
stellar contract invoke --id $ContractId --source-account $Source --network testnet --send no -- is_revoked --gate_id $GateId --revocation_hash $RevocationHash
