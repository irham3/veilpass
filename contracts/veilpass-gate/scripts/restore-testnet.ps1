param(
  [Parameter(Mandatory = $true)][string]$Identity,
  [Parameter(Mandatory = $true)][string]$ContractId,
  [Parameter(Mandatory = $true)][string]$KeyXdr
)

$ErrorActionPreference = "Stop"
Write-Output "Restore is an explicit Soroban transaction and requires the archived ledger key XDR."
stellar contract restore --id $ContractId --key-xdr $KeyXdr --source $Identity --network testnet
