param([Parameter(Mandatory = $true)][string]$Identity, [string]$Alias = "veilpass-gate-testnet")
$ErrorActionPreference = "Stop"
$manifest = Resolve-Path (Join-Path $PSScriptRoot "..\Cargo.toml")
stellar contract build --manifest-path $manifest --locked
$wasm = Resolve-Path (Join-Path $PSScriptRoot "..\target\wasm32v1-none\release\veilpass_gate.wasm")
$contractId = stellar contract deploy --wasm $wasm --source $Identity --network testnet --alias $Alias
Write-Output "VEILPASS_CONTRACT_ID=$contractId"
