$ErrorActionPreference = "Stop"

Set-Location (Resolve-Path "$PSScriptRoot\..\..")

$projectId = "apppromos"
$authResetUrl = "http://127.0.0.1:9099/emulator/v1/projects/$projectId/accounts"
$firestoreResetUrl = "http://127.0.0.1:8080/emulator/v1/projects/$projectId/databases/(default)/documents"

Write-Host ""
Write-Host "===== APPPROMOS QA LOCAL RESET ====="
Write-Host "Target: Firebase Emulators 127.0.0.1 only"

foreach ($port in 9099, 8080, 5000) {
  if (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) {
    throw "Emulator not available on port $port. Run firebase emulators:start first."
  }
}

if (-not $authResetUrl.StartsWith("http://127.0.0.1:9099/")) { throw "Invalid Auth target." }
if (-not $firestoreResetUrl.StartsWith("http://127.0.0.1:8080/")) { throw "Invalid Firestore target." }

Write-Host "Resetting Firestore Emulator..."
Invoke-RestMethod -Method Delete -Uri $firestoreResetUrl | Out-Null

Write-Host "Resetting Auth Emulator..."
Invoke-RestMethod -Method Delete -Uri $authResetUrl | Out-Null

Write-Host "OK - Local emulator data cleared"
Write-Host "OK - Production Firebase was not contacted"

& ".\tools\qa\Seed-AppPromos-QA.ps1"
if ($LASTEXITCODE -ne 0) { throw "ERROR: QA seed failed after local reset" }
