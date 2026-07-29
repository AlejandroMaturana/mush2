# -- DEV MQTT Credential Setup --
# Regenerates the Mosquitto password_file for DEV stack.
# Idempotent: safe to run multiple times.
#
# Prerequisites:
#   - Docker Desktop running
#   - 'docker compose -f docker-compose.dev.yml up -d' executed
#
# Usage:
#   .\scripts\dev-mqtt-setup.ps1

param(
  [string]$PasswordFileRel = "docker/mosquitto/dev/password_file"
)

$ErrorActionPreference = "Stop"

# -- Paths --
$ProjectRoot  = Split-Path -Parent $PSScriptRoot
$PasswordFile = Join-Path $ProjectRoot $PasswordFileRel
$PasswordDir  = Split-Path -Parent $PasswordFile

# -- Pre-checks --
Write-Host "[SETUP] Verificando Docker..." -ForegroundColor Cyan
docker info 2>$null | Out-Null
if (-not $?) {
  Write-Host "[SETUP]   [FAIL] Docker no esta corriendo" -ForegroundColor Red
  exit 1
}
Write-Host "[SETUP]   [OK] Docker disponible" -ForegroundColor Green

Write-Host "[SETUP] Verificando contenedor Mosquitto..." -ForegroundColor Cyan
$running = docker ps --filter name=mush2-dev-mosquitto --filter status=running --format "{{.Names}}" 2>$null
if (-not $running) {
  $exists = docker ps -a --filter name=mush2-dev-mosquitto --format "{{.Names}}" 2>$null
  if ($exists) {
    Write-Host "[SETUP]   [!!] Contenedor existe pero no esta corriendo" -ForegroundColor Yellow
    Write-Host "[SETUP]        Ejecuta: docker start mush2-dev-mosquitto" -ForegroundColor Yellow
    exit 1
  }
  Write-Host "[SETUP]   [!!] Contenedor mush2-dev-mosquitto no encontrado" -ForegroundColor Yellow
  Write-Host "[SETUP]        Ejecuta: docker compose -f docker-compose.dev.yml up -d" -ForegroundColor Yellow
  exit 1
}
Write-Host "[SETUP]   [OK] Contenedor activo" -ForegroundColor Green

# -- Users --
$users = @(
  @{ User = "backend_bridge"; Pass = "mush2_backend_bridge_2026!"; Desc = "Backend MQTT bridge service" },
  @{ User = "dev_device_dev_001"; Pass = "test_device_pass_2026!"; Desc = "Vertical slice test device" }
)

# -- Provision users --
Write-Host "[SETUP] Provisionando usuarios MQTT..." -ForegroundColor Cyan

# Build Docker volume path: D:\path\to\mosquitto\dev -> //d/path/to/mosquitto/dev
$driveLetter = ($PasswordDir -split ':')[0].ToLower()
$unixPath = ($PasswordDir -replace '^[A-Za-z]:', '') -replace '\\', '/'
$dockerVolumePath = "//${driveLetter}${unixPath}"
$containerConfigDir = "/mosquitto/config"

$provisionOk = $true
foreach ($u in $users) {
  Write-Host "[SETUP]   > $($u.User) ($($u.Desc))" -ForegroundColor Gray

  # Temporarily allow stderr warnings from mosquitto_passwd
  $prevPref = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"

  $null = docker run --rm `
    -v "${dockerVolumePath}:${containerConfigDir}:rw" `
    eclipse-mosquitto:2 `
    sh -c "mosquitto_passwd -b $containerConfigDir/password_file '$($u.User)' '$($u.Pass)'" 2>$null

  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $prevPref

  if ($exitCode -eq 0) {
    Write-Host "[SETUP]     [OK] $($u.User) creado/actualizado" -ForegroundColor Green
  } else {
    Write-Host "[SETUP]     [FAIL] $($u.User) fallo (exit code: $exitCode)" -ForegroundColor Red
    $provisionOk = $false
  }
}

if (-not $provisionOk) {
  Write-Host "[SETUP] [FAIL] Provisioning fallo" -ForegroundColor Red
  exit 1
}

# Show final content
Write-Host "[SETUP]   > password_file contiene:" -ForegroundColor Gray
Get-Content $PasswordFile | ForEach-Object { Write-Host "          $_" -ForegroundColor Gray }

# -- Restart Mosquitto --
Write-Host "[SETUP] Reiniciando Mosquitto..." -ForegroundColor Cyan
docker restart mush2-dev-mosquitto 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "[SETUP]   [OK] Mosquitto reiniciado" -ForegroundColor Green
  Start-Sleep -Seconds 2
} else {
  Write-Host "[SETUP]   [FAIL] No se pudo reiniciar" -ForegroundColor Red
  exit 1
}

# -- Validate auth --
Write-Host "[SETUP] Validando autenticacion..." -ForegroundColor Cyan
$authOk = $true
foreach ($u in $users) {
  Write-Host "[SETUP]   > $($u.User)..." -ForegroundColor Gray

  $result = docker exec mush2-dev-mosquitto `
    mosquitto_pub -h localhost -p 1883 `
    -u "$($u.User)" -P "$($u.Pass)" `
    -t "mush2/_validate/$($u.User)" -m "ok" 2>&1

  $exitCode = $LASTEXITCODE
  if ($exitCode -eq 0) {
    Write-Host "[SETUP]     [OK] $($u.User) autentica correctamente" -ForegroundColor Green
  } else {
    Write-Host "[SETUP]     [FAIL] $($u.User) fallo autenticacion (exit: $exitCode)" -ForegroundColor Red
    $authOk = $false
  }
}

# -- Final report --
Write-Host ""
if ($authOk -and $provisionOk) {
  Write-Host "+-----------------------------------------------------+" -ForegroundColor Green
  Write-Host "| SETUP COMPLETO - MQTT DEV listo para pruebas        |" -ForegroundColor Green
  Write-Host "| Usuarios: 2 creados, 2 autenticando                 |" -ForegroundColor Green
  Write-Host "| Mosquitto: OK                                       |" -ForegroundColor Green
  Write-Host "| Siguiente: pruebas MQTT remotas desde ESP32         |" -ForegroundColor Green
  Write-Host "+-----------------------------------------------------+" -ForegroundColor Green
} else {
  Write-Host "+-----------------------------------------------------+" -ForegroundColor Red
  Write-Host "| SETUP FALLO - revisar logs del contenedor           |" -ForegroundColor Red
  Write-Host "+-----------------------------------------------------+" -ForegroundColor Red
  exit 1
}

Write-Host "[SETUP] Logs del contenedor:" -ForegroundColor Cyan
docker logs mush2-dev-mosquitto --tail 10 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
