$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..\..")
Write-Host "`n===== A7.6.3 - VERIFICAR EMULATORS ====="
$ports = 9099,8080,9199,5000
foreach ($port in $ports) {
  if (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) {
    throw "Emulator no disponible en puerto $port. Ejecutá firebase emulators:start primero."
  }
}
Write-Host "OK - Emulators detectados"
node ".\tools\qa\seed-emulators.mjs"
if ($LASTEXITCODE -ne 0) { throw "ERROR ejecutando seed QA" }
