# ── DEV MQTT Credential Setup ────────────────────────────────────
# Initializes the Mosquitto password_file with DEV test users.
# Run this after `docker compose -f docker-compose.dev.yml up -d`.
#
# Prerequisites:
#   - Docker Desktop running
#   - eclipse-mosquitto:2.0 image (pulled automatically if missing)
#
# Usage:
#   .\scripts\dev-mqtt-setup.ps1

param(
  [string]$PasswordFile = "docker/mosquitto/dev/password_file"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PasswordFile = Join-Path -Path $ProjectRoot -ChildPath $PasswordFile
$MosquittoImage = "eclipse-mosquitto:2.0"

# Container path for bind mount (Windows → Linux container format)
$ContainerPath = "//c" + ($PasswordFile -replace ':', '' -replace '\\', '/')

# Users to provision
$users = @(
  @{ User = "dev_device_dev_001"; Pass = "test_device_pass_2026!"; Desc = "Vertical slice test device" },
  @{ User = "backend_bridge"; Pass = "mush2_backend_bridge_2026!"; Desc = "Backend bridge service" }
)

Write-Host "[SETUP] Initializing Mosquitto password_file" -ForegroundColor Cyan
Write-Host "[SETUP] Password file: $PasswordFile" -ForegroundColor Gray

# Create an empty file, then use -b to add users one by one
New-Item -ItemType File -Path $PasswordFile -Force | Out-Null

foreach ($u in $users) {
  Write-Host "[SETUP] Creating user: $($u.User) ($($u.Desc))" -ForegroundColor Gray
  $result = docker run --rm `
    -v "${ContainerPath}:/mosquitto/config/password_file" `
    $MosquittoImage `
    mosquitto_passwd -b /mosquitto/config/password_file $($u.User) $($u.Pass) 2>&1

  if ($LASTEXITCODE -eq 0) {
    Write-Host "[SETUP]   ✓ $($u.User) created" -ForegroundColor Green
  } else {
    Write-Host "[SETUP]   ✗ $($u.User) failed: $result" -ForegroundColor Red
  }
}

# Restart Mosquitto to reload password_file
Write-Host "[SETUP] Restarting Mosquitto..." -ForegroundColor Gray
docker restart mush2-dev-mosquitto 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "[SETUP] ✓ Mosquitto restarted" -ForegroundColor Green
} else {
  Write-Host "[SETUP] ⚠ Could not restart container. Is the stack running?" -ForegroundColor Yellow
}

Write-Host "[SETUP] Done. Verify with:" -ForegroundColor Cyan
Write-Host "[SETUP]   docker logs mush2-dev-mosquitto --tail 20" -ForegroundColor Gray
