param(
  [string]$ContractId = "CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK",
  [string]$Source = "GDVP7QVOCQ4L4CDNXVWD53ATXGYDXTDOYVFPJ3UA5OTWJW7XGXSNFXRJ",
  [string]$GateId = "premium-holder",
  [string]$RevocationHash = "0000000000000000000000000000000000000000000000000000000000000000"
)
$ErrorActionPreference = "Stop"

Write-Output "Reading VeilPass gate from Stellar Testnet..."
stellar contract invoke --id $ContractId --source-account $Source --network testnet --send no -- get_gate --gate_id $GateId

Write-Output "Checking a non-revoked fixture hash..."
stellar contract invoke --id $ContractId --source-account $Source --network testnet --send no -- is_revoked --gate_id $GateId --revocation_hash $RevocationHash
