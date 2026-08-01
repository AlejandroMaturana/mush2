# Protocol Simulator (Virtual Device) — FASE 1

Simulador de protocolo que emula un dispositivo físico Mush2 frente al backend
MQTT. Es el entregable central de **FASE 1** del ISSUE-031 (Simulation Platform).

Comportamiento (paridad exacta con el firmware):

- publica **telemetría** periódica conforme a `telemetry.schema.json` en
  `mush2/{deviceId}/telemetry`;
- publica **status** `online`/`offline` (retained) conforme a `status.schema.json`
  en `mush2/{deviceId}/status`;
- se suscribe a `mush2/{deviceId}/actuators` y responde a comandos canónicos
  (RFC-0009 §5.1 / ADR-030) con **ACK** (RFC-0009 §5.2) en `mush2/{deviceId}/ack`,
  replicando la semántica de `firmware/src/mqtt_client.cpp` + `tasks.cpp`
  (`OK`, `INVALID_CHANNEL`, `UNKNOWN_CMD`, `ALREADY_EXECUTED` por dedup de `cmdId`);
- el estado interno de los 4 canales existe **únicamente** para responder comandos
  y reflejarse en la telemetría. Sin persistencia, scheduler, lógica de cultivo
  ni máquina de estados (pertenecen a FASE 2).

## Alcance y aislamiento del protocolo

Toda la lógica de protocolo (validación, parsing, construcción de mensajes) vive
en `src/contract/` con dependencias **solo de Node estándar** (sin `mqtt`):

| Módulo | Responsabilidad |
| --- | --- |
| `validator.js` | Validador JSON Schema (subconjunto draft-07) |
| `schemas.js` | Carga de los 8 schemas canónicos desde `docs/contracts/conformance/schemas/` |
| `command.js` | Parser de comandos canónicos (paridad firmware) |
| `ack.js` | Construcción de ACK y resolución de estados |
| `telemetry.js` | Generación de telemetría (fixed/drift, PRNG con seed) |
| `status.js` | Construcción de status |

Estos módulos están preparados para extraerse a un paquete compartido
`packages/protocol` (RFC-0010, DRAFT) cuando esa fase sea aprobada; el simulador
no implementa una segunda copia del protocolo sino una capa fina de cliente.

## Requisitos

- Node.js 18+ (probado con v24)
- pnpm
- Docker (stack dev: mosquitto + postgres)
- `mosquitto_passwd` disponible en `PATH` (usado por el backend para provisionar
  credenciales ADR-028/029)
- Backend dev en marcha con `.env.development` raíz (ya existe en el repo;
  `MQTT_BROKER_URL=mqtt://localhost:1884`)

## Reproducción completa desde un repositorio limpio

### 1. Instalar dependencias del workspace

```bash
pnpm install
```

### 2. Levantar el stack de desarrollo (mosquitto dev :1884, postgres :5433)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Preparar y arrancar el backend

```bash
# Sync de esquemas contra la BD dev (postgres en 5433)
pnpm --filter mush2-backend db:sync

# Terminal 1 — backend dev
pnpm --filter mush2-backend dev
```

El backend se conecta al broker en `mqtt://localhost:1884` (ver `.env.development`)
y queda escuchando en `http://localhost:3797`.

### 4. Arrancar el simulador

```bash
# Terminal 2
pnpm --filter mush2-simulator dev
```

En el primer arranque el simulador:

1. se registra con `POST /api/v1/devices/register` (`deviceId=sim_001`);
2. recibe credenciales MQTT provisionadas (ADR-028) y las persiste en
   `simulator/.sim-credentials.json`;
3. conecta al broker con `clientId=sim_001` (requerido por las ACL `pattern %c`
   de `docker/mosquitto/dev/acl.conf`);
4. publica `status online` (retained) y telemetría cada 10 s.

Reinicios posteriores reutilizan las credenciales persistidas (o `SIM_MQTT_USER`/
`SIM_MQTT_PASS` si se definen).

### 5. Verificación end-to-end

**a) Telemetría y status en el broker** (opcional, con mosquitto cliente):

```bash
mosquitto_sub -p 1884 -t "mush2/sim_001/telemetry" -v -u backend_bridge -P mush2_backend_bridge_2026!
mosquitto_sub -p 1884 -t "mush2/sim_001/status" -v -u backend_bridge -P mush2_backend_bridge_2026!
```

**b) Comando → ACK → estado en la API.** Envía un comando manual desde el
backend (genera `cmdId` y publica el comando canónico):

```bash
# Terminal 3 — enciende el canal 2 (HEATER)
curl -X PATCH http://localhost:3797/api/v1/actuators/2 \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"sim_001","command":"ON"}'
```

Respuesta esperada: `{ "channel": 2, "state": "ON", "mode": "REMOTE", "cmdId": "<uuid>" }`.

El simulador recibe el comando, responde `ACK { cmdId, channel:2, state:true, status:"OK", ts }`
y el backend actualiza la fila del actuador. Comprueba el estado reflejado:

```bash
curl "http://localhost:3797/api/v1/actuators?deviceId=sim_001"
# → actuators: [{ channel: 2, state: "ON", ... }]
```

Repite con `command: "OFF"` y verifica el estado en `GET`.

**c) Logs del simulador:**

```
[device] Actuator ch2: ON (REMOTE) cmdId=<uuid>
[device] ACK OK ch2 cmdId=<uuid>
```

### 6. Verificación del ACK duplicado

Reenvía el **mismo** comando (mismo `cmdId`) usando `mosquitto_pub`:

```bash
mosquitto_pub -p 1884 -t "mush2/sim_001/actuators" \
  -u backend_bridge -P mush2_backend_bridge_2026! \
  -m '{"cmdId":"<mismo uuid>","source":"manual","ts":1785340800,"command":{"type":"ACTUATOR_SET","channel":2,"value":true}}'
```

El simulador responde `ACK { status:"ALREADY_EXECUTED", ... }` (dedup en memoria,
política MVP: LRU de 128 entradas con TTL de 60 s; sin historial persistente).

## Configuración (variables de entorno)

| Variable | Default | Descripción |
| --- | --- | --- |
| `SIM_DEVICE_ID` | `sim_001` | Identidad del dispositivo virtual |
| `SIM_BROKER_URL` | `mqtt://localhost:1884` | Broker MQTT dev |
| `SIM_API_URL` | `http://localhost:3797/api/v1` | API del backend |
| `SIM_TELEMETRY_INTERVAL_MS` | `10000` | Intervalo de telemetría |
| `SIM_TELEMETRY_MODE` | `drift` | `drift` (random walk con seed) o `fixed` (determinístico) |
| `SIM_SEED` | `12345` | Semilla del PRNG |
| `SIM_TELEMETRY_FIXED` | — | JSON con valores base para modo fixed (ej. `{"temp":24,"co2":700}`) |
| `SIM_TOPIC_PREFIX` | `mush2` | Prefijo de tópicos (coincide con el backend) |
| `SIM_MQTT_USER` / `SIM_MQTT_PASS` | — | Credenciales MQTT (omite registro si se definen) |
| `SIM_CREDENTIALS_FILE` | `.sim-credentials.json` | Archivo de credenciales persistidas |
| `SIM_RECONNECT_PERIOD_MS` | `5000` | Reintento de conexión del cliente MQTT |
| `SIM_RETAIN_STATUS` | `true` | Publica status online/offline con retained |
| `SIM_LOG_LEVEL` | `info` | Nivel de log |

Flags de CLI que sobreescriben env: `--deviceId`, `--broker`, `--api`,
`--interval`, `--telemetry`, `--seed`.

**Telemetría determinística para tests:** modo `fixed` (valores fijos, opcionalmente
`SIM_TELEMETRY_FIXED`) o `drift` con `SIM_SEED` fija producen secuencias
reproducibles. Ejemplo:

```bash
SIM_TELEMETRY_MODE=fixed SIM_TELEMETRY_FIXED='{"temp":25,"hum":70,"co2":600}' pnpm --filter mush2-simulator start
```

## Tests

```bash
# Contract tests + unitarios del simulador
pnpm --filter mush2-simulator test

# Backend (sin regresiones)
pnpm --filter mush2-backend test
```

- `src/__tests__/contract.test.js` — todo payload emitido (telemetry/status/ack)
  y consumido (command) es conforme a los schemas; determinismo de la telemetría;
  dedup acotado.
- `src/__tests__/device.test.js` — VirtualDevice con cliente MQTT fake: suscripción,
  ACK ante comandos canónicos (incl. `UNKNOWN_CMD`, `INVALID_CHANNEL`,
  `ALREADY_EXECUTED`), rechazo de formato legacy, telemetría conforme y status offline.

## Referencias

- ISSUE-031 (FASE 1 — Protocol Simulator) · ADR-031 · EDD-007
- RFC-0009 §5.1/§5.2 · ADR-030 · ADR-026 (ts en segundos) · ADR-028/029 (provisioning)
- Contrato congelado: `docs/contracts/conformance/` (schemas + examples + manifest)
