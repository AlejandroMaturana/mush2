#!/usr/bin/env bash
# ── verify-broker-provisioning.sh ─────────────────────────────────
# Codified runtime verification of the Mosquitto provisioning contract
# against a REAL eclipse-mosquitto:2 container (prod config, TLS 8883,
# ACL por client_id). PR-B, Ciclo 4 — avance ISSUE-065 (INF-006, P0).
#
# Verifica en runtime lo que los contract tests estáticos
# (containerProvisioning.test.js) NO pueden probar:
#
#   1. El hash `$7$` nativo Node (mosquittoPasswordHash, ISSUE-024) es
#      ACEPTADO por el broker real tras recargar el password_file.
#   2. SIGHUP es el mecanismo de recarga: SIN SIGHUP, un usuario recién
#      provisionado es RECHAZADO (control negativo — prueba que la
#      recarga es necesaria y que MosquittoProvisioningService.reload()
#      es el paso que la dispara).
#   3. TLS obligatorio en 8883: una conexión EN CLARO al listener TLS
#      debe ser rechazada (ISSUE-015/ADR-023).
#   4. ACL por client_id (`%c`) verificada end-to-end: el bridge autorizado
#      RECIBE la telemetría del dispositivo; un "snooper" con otro
#      client_id NO recibe nada (mosquitto concede/descarta en silencio,
#      la ACL solo se observa por aislamiento).
#   5. Sin secretos horneados en la imagen (.dockerignore): certs y
#      password_file reales excluidos del build context.
#
# Uso:
#   ./scripts/verify-broker-provisioning.sh
#
# Requisitos:
#   - Docker Engine / Docker Desktop con el socket accesible.
#   - Node.js >= 18 (para generar el hash con el código real del repo).
#   - `docker/mosquitto/certs/{ca.crt,server.crt,server.key}` presentes
#     (certs gitignored; se montan en runtime, nunca se hornean).
#   - mosquitto-clients (mosquitto_pub) en el host — recomendado. Si no
#     está, se usa el mosquitto_pub del contenedor (en Docker Desktop
#     Windows puede tardar ~60s en arrancar en frío; se reintenta).
#
# Hermético: usa un directorio temporal; NUNCA toca el password_file
# del repo (docker/mosquitto/{dev,prod}/password_file).
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

MOSQ_IMAGE="eclipse-mosquitto:2"
CNAME="mush2-verify-mosquitto"
HOST_TLS_PORT="18883"

BRIDGE_USER="backend_bridge"
BRIDGE_PASS="Bridge_Pass_Verify_2026!"
DEV_USER="dev_verify_1"
DEV_PASS="Device_Pass_Verify_2026!"
DEV_CLIENT_ID="verify_1"

# ── Helpers ──────────────────────────────────────────────────────

# Convierte a ruta Windows cuando corre bajo Git Bash/MSYS (Docker
# Desktop); en Linux devuelve la ruta tal cual.
to_docker_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

PASSED=0
FAILED=0

record() {
  local label="$1"
  local ok="$2"
  if [ "$ok" -eq 0 ]; then
    PASSED=$((PASSED + 1))
    printf '  [PASS] %s\n' "$label"
  else
    FAILED=$((FAILED + 1))
    printf '  [FAIL] %s\n' "$label"
  fi
}

# Publica por MQTTS 8883 (TLS con cadena verificada). $1..$n pasados a
# mosquitto_pub; devuelve su exit code.
#   host client   -> --cafile <ruta host al ca.crt> + puerto publicado
#   in-container  -> --cafile /mosquitto/certs/ca.crt (envuelto con
#                    busybox `timeout`: en Docker Desktop Windows los
#                    open() de un contenedor recién creado pueden fallar
#                    o colgarse de forma transitoria durante ~60s).
mqtt_pub() {
  if [ -n "$HOST_MOSQUITTO" ]; then
    "$HOST_MOSQUITTO" -h localhost -p "$HOST_TLS_PORT" \
      --cafile "$CA_FILE_HOST" -q 1 -m ok "$@" >/dev/null 2>&1
  else
    docker exec "$CNAME" timeout 15 mosquitto_pub \
      -h localhost -p 8883 \
      --cafile /mosquitto/certs/ca.crt \
      -q 1 -m ok "$@" >/dev/null 2>&1
  fi
  return $?
}

# Publica EN CLARO (sin TLS) contra el listener TLS 8883 — debe fallar.
mqtt_pub_plain() {
  if [ -n "$HOST_MOSQUITTO" ]; then
    "$HOST_MOSQUITTO" -h localhost -p "$HOST_TLS_PORT" \
      -q 1 -m ok "$@" >/dev/null 2>&1
  else
    docker exec "$CNAME" timeout 15 mosquitto_pub \
      -h localhost -p 8883 \
      -q 1 -m ok "$@" >/dev/null 2>&1
  fi
  return $?
}

# Suscribe por MQTTS. mosquitto NO deniega de forma visible ni el
# publish ni el SUBACK por ACL: concede el subscribe y descarta los
# mensajes en silencio. Por eso la ACL se valida end-to-end (ver check
# 6): el suscriptor que NO tiene acceso no debe recibir NADA (-C 1 -W 6
# => exit 27 = timeout sin mensajes), y el autorizado sí (-C 1 => exit 0
# al recibir). En la rama host no se envuelve con `timeout` (el -W
# auto-limita; `timeout` GNU + background + wait deadlockea en MSYS).
mqtt_sub() {
  if [ -n "$HOST_MOSQUITTO" ]; then
    "$HOST_MOSQUITTO_DIR/mosquitto_sub" -h localhost -p "$HOST_TLS_PORT" \
      --cafile "$CA_FILE_HOST" "$@" >/dev/null 2>&1
  else
    docker exec "$CNAME" timeout 15 mosquitto_sub \
      -h localhost -p 8883 \
      --cafile /mosquitto/certs/ca.crt "$@" >/dev/null 2>&1
  fi
  return $?
}

# Arranca un mosquitto_sub en background, espera a que suscriba y
# publica. Devuelve el exit code del suscriptor (0 = recibió; 27 =
# timeout sin mensajes). Los llamadores capturan el RC con `||`.
mqtt_sub_and_publish() {
  local sub_opts="$1" topic="$2" sub_client="$3" sub_user="$4" sub_pass="$5"
  local pub_client="$6" pub_user="$7" pub_pass="$8" pub_topic="$9"
  # shellcheck disable=SC2086
  mqtt_sub -i "$sub_client" -u "$sub_user" -P "$sub_pass" $sub_opts -t "$topic" &
  local sub_pid=$!
  sleep 1
  mqtt_pub -i "$pub_client" -u "$pub_user" -P "$pub_pass" -t "$pub_topic" || true
  wait "$sub_pid"
  return $?
}

# Genera la línea `user:$7$...` con el código real del repo (sin pasar
# la contraseña por argv de ningún subproceso — ISSUE-024).
node_hash_line() {
  local user="$1"
  local pass="$2"
  VERIFY_SVC_PATH="$PROJECT_ROOT/backend/src/services/mosquittoProvisioningService.js" \
  VERIFY_HASH_USER="$user" \
  VERIFY_HASH_PASS="$pass" \
  node --input-type=module --eval '
    import { pathToFileURL } from "node:url";
    const { mosquittoPasswordHash } = await import(pathToFileURL(process.env.VERIFY_SVC_PATH).href);
    process.stdout.write(process.env.VERIFY_HASH_USER + ":" + mosquittoPasswordHash(process.env.VERIFY_HASH_PASS));
  '
}

cleanup() {
  docker rm -f "$CNAME" >/dev/null 2>&1 || true
  if [ -n "${VERIFY_DIR:-}" ] && [ -d "$VERIFY_DIR" ]; then
    rm -rf "$VERIFY_DIR"
  fi
}
trap cleanup EXIT

# ── Preflight ────────────────────────────────────────────────────

echo "=== Mush2 — Verificación de provisioning MQTT en contenedor (PR-B/C4, avance I065) ==="
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker no disponible"
  exit 1
fi
docker info >/dev/null 2>&1 || {
  echo "ERROR: Docker no está corriendo"
  exit 1
}
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node no disponible (se requiere para generar el hash \$7\$ con el código real)"
  exit 1
fi

CERTS="$PROJECT_ROOT/docker/mosquitto/certs"
for f in ca.crt server.crt server.key; do
  [ -f "$CERTS/$f" ] || {
    echo "ERROR: falta $CERTS/$f — monta los certs reales (gitignored) antes de verificar"
    exit 1
  }
done

# Cliente MQTT: se prefiere el `mosquitto_pub` del HOST contra el puerto
# publicado (fiable en Docker Desktop; en CI Linux basta con instalar
# mosquitto-clients). Fallback: el mosquitto_pub DENTRO del contenedor,
# que en Docker Desktop (Windows) tiene un arranque en frío (~60s) para
# cargar --cafile; en Linux arranca al instante.
HOST_MOSQUITTO=""
if command -v mosquitto_pub >/dev/null 2>&1; then
  HOST_MOSQUITTO="$(command -v mosquitto_pub)"
elif [ -x "/c/Program Files/mosquitto/mosquitto_pub.exe" ]; then
  HOST_MOSQUITTO="/c/Program Files/mosquitto/mosquitto_pub.exe"
elif [ -x "C:/Program Files/mosquitto/mosquitto_pub.exe" ]; then
  HOST_MOSQUITTO="C:/Program Files/mosquitto/mosquitto_pub.exe"
fi
if [ -n "$HOST_MOSQUITTO" ]; then
  HOST_MOSQUITTO_DIR="$(dirname "$HOST_MOSQUITTO")"
  echo "Cliente MQTT: host ($HOST_MOSQUITTO) -> 127.0.0.1:$HOST_TLS_PORT"
else
  echo "Cliente MQTT: in-container (mosquitto_pub) contra listener 8883"
fi
CA_FILE_HOST="$(to_docker_path "$CERTS/ca.crt")"

# ── Setup hermético ──────────────────────────────────────────────

VERIFY_DIR="$(mktemp -d)"
CFG="$VERIFY_DIR/config"
DATA="$VERIFY_DIR/data"
LOG="$VERIFY_DIR/log"
mkdir -p "$CFG" "$DATA" "$LOG"

# Config prod versionada (misma que despliega el broker real).
cp "$PROJECT_ROOT/docker/mosquitto/prod/mosquitto.conf" "$CFG/mosquitto.conf"
cp "$PROJECT_ROOT/docker/mosquitto/prod/acl.conf" "$CFG/acl.conf"

# Password_file temporal creado en el HOST con el hash nativo Node
# (mismo formato $7$ de mosquitto_passwd; verificado contra el broker).
# Crearlo fuera del contenedor evita permisos root/0600 que impiden al
# usuario `mosquitto` leerlo en bind-mounts de Docker Desktop.
printf '%s\n' "$(node_hash_line "$BRIDGE_USER" "$BRIDGE_PASS")" > "$CFG/password_file"

# Broker con la misma topología que docker-compose.yml (config ro,
# certs ro, data/log rw, listener TLS 8883 publicado).
docker rm -f "$CNAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CNAME" \
  -p "127.0.0.1:$HOST_TLS_PORT:8883" \
  -v "$(to_docker_path "$CFG"):/mosquitto/config:ro" \
  -v "$(to_docker_path "$CERTS"):/mosquitto/certs:ro" \
  -v "$(to_docker_path "$DATA"):/mosquitto/data" \
  -v "$(to_docker_path "$LOG"):/mosquitto/log" \
  "$MOSQ_IMAGE" >/dev/null

echo "Broker iniciado: eclipse-mosquitto:2 (listener TLS 8883 con config prod)"
echo ""

# ── 1. Baseline: el bridge autentica por TLS (y broker listo) ────
#
# READINESS: el listener 8883 se abre a los ~1s, pero en Docker Desktop
# (Windows, bind-mount gRPC-FUSE) los clientes TLS in-container a un
# contenedor recién creado fallan de forma transitoria (open() ENOENT /
# hang) durante ~30-90s. En Linux/Linux-CI esto pasa en el primer
# intento. Estrategia: reintentar EL MISMO pub TLS hasta 240s; cada
# intento está acotado a 15s por `timeout` (ver mqtt_pub).

echo "1) Baseline — usuario del bridge autentica por MQTTS 8883"
sleep 3
BASELINE_OK=0
for _ in $(seq 1 240); do
  if mqtt_pub -i "$BRIDGE_USER" -u "$BRIDGE_USER" -P "$BRIDGE_PASS" -t "mush2/$BRIDGE_USER/actuators"; then
    BASELINE_OK=1
    break
  fi
  sleep 0.5
done
record "bridge autentica sobre TLS 8883 (broker listo)" $((1 - BASELINE_OK))
if [ "$BASELINE_OK" -ne 1 ]; then
  echo ""
  echo "ERROR: el bridge no autenticó por TLS en 240s (revisa config/certs):"
  docker logs "$CNAME" 2>&1 | tail -20 || true
  echo "--- mosquitto.log (host) ---"
  cat "$LOG/mosquitto.log" 2>/dev/null | tail -20 || true
  exit 1
fi
echo ""

# ── 2. Control negativo: SIN SIGHUP el nuevo usuario es rechazado ─

echo "2) Control negativo — SIN SIGHUP un usuario recién provisionado es rechazado"
printf '%s\n' "$(node_hash_line "$DEV_USER" "$DEV_PASS")" >> "$CFG/password_file"
if mqtt_pub -i "$DEV_CLIENT_ID" -u "$DEV_USER" -P "$DEV_PASS" -t "mush2/$DEV_CLIENT_ID/telemetry"; then
  record "sin SIGHUP -> la credencial nueva es RECHAZADA (recarga requerida)" 1
else
  record "sin SIGHUP -> la credencial nueva es RECHAZADA (recarga requerida)" 0
fi
echo ""

# ── 3. Provisioning real: hash Node + SIGHUP → la credencial vive ─

echo "3) Provisioning — hash \$7\$ nativo Node + SIGHUP activa la credencial"
docker kill --signal HUP "$CNAME" >/dev/null
sleep 1
if mqtt_pub -i "$DEV_CLIENT_ID" -u "$DEV_USER" -P "$DEV_PASS" -t "mush2/$DEV_CLIENT_ID/telemetry"; then
  record "tras SIGHUP el dispositivo autentica y publica telemetría" 0
else
  record "tras SIGHUP el dispositivo autentica y publica telemetría" 1
fi
echo ""

# ── 4. Contraseña incorrecta → rechazo ───────────────────────────

echo "4) Seguridad — contraseña incorrecta es rechazada"
if mqtt_pub -i "$DEV_CLIENT_ID" -u "$DEV_USER" -P "wrong_pass_2026!" -t "mush2/$DEV_CLIENT_ID/telemetry"; then
  record "password incorrecta -> connection refused (not authorised)" 1
else
  record "password incorrecta -> connection refused (not authorised)" 0
fi
echo ""

# ── 5. TLS obligatorio en 8883 (ISSUE-015) ───────────────────────

echo "5) Seguridad — conexión EN CLARO al listener TLS 8883 es rechazada"
if mqtt_pub_plain -u "$DEV_USER" -P "$DEV_PASS" -t "mush2/$DEV_CLIENT_ID/telemetry"; then
  record "sin TLS -> handshake rechazado" 1
else
  record "sin TLS -> handshake rechazado" 0
fi
echo ""

# ── 6. ACL por client_id (ADR-028/§9.1) ──────────────────────────

echo "6) ACL — aislamiento por client_id (ADR-028/§9.1, end-to-end)"
# 6a) El bridge (autorizado a leer telemetría) RECIBE el mensaje.
SUB_RC=0
mqtt_sub_and_publish \
  "-q 0 -C 1 -W 6" "mush2/$DEV_CLIENT_ID/telemetry" \
  "$BRIDGE_USER" "$BRIDGE_USER" "$BRIDGE_PASS" \
  "$DEV_CLIENT_ID" "$DEV_USER" "$DEV_PASS" "mush2/$DEV_CLIENT_ID/telemetry" || SUB_RC=$?
if [ "$SUB_RC" -eq 0 ]; then
  record "bridge autorizado recibe telemetría del dispositivo" 0
else
  record "bridge autorizado recibe telemetría del dispositivo" 1
fi
# 6b) Un "snooper" (otro client_id) NO recibe nada del topic ajeno.
SUB_RC=0
mqtt_sub_and_publish \
  "-q 0 -C 1 -W 6" "mush2/$DEV_CLIENT_ID/telemetry" \
  "snooper_1" "$DEV_USER" "$DEV_PASS" \
  "$DEV_CLIENT_ID" "$DEV_USER" "$DEV_PASS" "mush2/$DEV_CLIENT_ID/telemetry" || SUB_RC=$?
if [ "$SUB_RC" -eq 27 ]; then
  record "snooper (client_id ajeno) NO recibe telemetría -> aislado" 0
else
  record "snooper (client_id ajeno) NO recibe telemetría -> aislado" 1
fi
echo ""

# ── 7. Sin secretos horneados (.dockerignore) ────────────────────

echo "7) Imagen — sin certs/password_file en el build context (.dockerignore)"
DOCKERIGNORE="$PROJECT_ROOT/.dockerignore"
[ -f "$DOCKERIGNORE" ] && grep -q '^docker/mosquitto/certs$' "$DOCKERIGNORE"
record ".dockerignore excluye docker/mosquitto/certs" $?
[ -f "$DOCKERIGNORE" ] && grep -q '^docker/mosquitto/\*/password_file$' "$DOCKERIGNORE"
record ".dockerignore excluye password_file" $?
echo ""

# ── Resumen ──────────────────────────────────────────────────────

echo "=== Resumen: $PASSED pass, $FAILED fail ==="
if [ "$FAILED" -gt 0 ]; then
  echo "RESULTADO: FAIL — el provisioning en contenedor no cumple el contrato"
  exit 1
fi
echo "RESULTADO: PASS — provisioning MQTT verificado en contenedor (verde→rojo→verde)"
