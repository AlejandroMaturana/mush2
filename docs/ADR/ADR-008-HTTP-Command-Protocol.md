# ADR-008: Protocolo de comandos vía HTTP polling con cola persistente

**Fecha**: 2026-06-13 (actualizado 2026-06-27)
**Estado**: Aceptado

## Contexto
El sistema requiere comunicación bidireccional entre el nodo ESP32-S3 y el backend para telemetría (nodo → backend) y comandos de actuadores (backend → nodo). La implementación original con brokers MQTT públicos (test.mosquitto.org, broker.hivemq.com) presentó problemas de seguridad al operar sin TLS ni autenticación, y se descartó por depender de infraestructura externa sin SLA. Se adoptó un esquema de polling HTTP directo al backend, pero la implementación actual aún presenta fallos de sincronización en comandos de actuadores AppWeb-SSR. Se requiere formalizar un protocolo robusto y escalable.

## Decisión
Implementar un protocolo de comandos basado en **HTTP polling** sobre REST API, reemplazando completamente MQTT, con:
- **Telemetría**: `POST /api/v1/telemetry` (firmware → backend)
- **Comandos**: `GET /api/v1/actuators?deviceId=...` con polling adaptativo (firmware ← backend)
- **Confirmaciones**: `POST /api/v1/commands/{cmdId}/ack` (firmware → backend)
- **Heartbeat**: `POST /api/v1/device/{id}/heartbeat` (firmware → backend)
- **Cola de comandos persistente** en PostgreSQL con reintentos, expiración y deduplicación
- **Comunicación cifrada** vía TLS (HTTPS) y autenticación por API key por dispositivo

## Motivos

### Abandono de MQTT
1. **Falta de seguridad en brokers públicos**: test.mosquitto.org y broker.hivemq.com operan sin TLS en puerto 1883; cualquier atacante en la red puede espiar o inyectar comandos.
2. **Dependencia de terceros sin SLA**: Caídas de broker público dejan inoperativo el sistema de control.
3. **Complejidad de broker privado**: Operar Mosquitto con TLS, autenticación y persistencia añade infraestructura que no justifica su beneficio frente a HTTP directo.

### Elección de HTTP polling
4. **Simplicidad**: HTTP con WiFiClient nativo; sin librerías MQTT adicionales.
5. **Seguridad controlada**: TLS nativo con certificados; autenticación mediante API key por dispositivo; validación de schema en cada endpoint.
6. **Sin puertos bloqueados**: HTTP/HTTPS (puerto 3797/443) no requiere configuración especial de red corporativa o doméstica.
7. **Idempotencia por diseño**: Cada comando lleva un `cmdId` único (UUID o `<timestamp><incr>`); la cola descarta duplicados y el firmware ignora comandos ya ejecutados.

### Cola de comandos persistente
8. **Garantía de entrega**: Los comandos se almacenan en PostgreSQL hasta que el firmware los confirma vía ACK.
9. **Reintentos automáticos**: Backoff exponencial (5s → 15s → 45s → máx 120s) hasta 5 intentos.
10. **Expiración**: Comandos no confirmados tras 5 minutos se marcan como `EXPIRED`; el usuario recibe notificación.
11. **Deduplicación**: El backend descarta comandos con `cmdId` duplicado antes de encolarlos.

### Polling adaptativo
12. **Respuesta rápida cuando hay actividad**: Intervalo base de 3s si hay comandos pendientes o cambios de estado.
13. **Eficiencia en reposo**: Backoff progresivo hasta 30s cuando no hay actividad; se reduce a 3s al encolar un nuevo comando.
14. **Jitter aleatorio**: ±500ms para evitar ráfagas sincronizadas de múltiples nodos.

## Consecuencias
- **Latencia máxima de ~3s** para comandos de actuadores (vs MQTT prácticamente instantáneo).
- **Mayor ancho de banda** por peticiones HTTP periódicas (cabeceras + TLS handshake).
- **El firmware debe mantener el stack HTTP/TLS activo**, con ~20KB de RAM para mbedTLS (ya contemplado en `STACK_MQTT`).
- **Comandos expirados** si el firmware está desconectado más de 5 minutos; el usuario debe reenviarlos.
- **Mayor carga en backend** frente a MQTT push; mitigable con jitter y rate limiting por dispositivo.
- **El heartbeat reemplaza al LWT de MQTT** para detección de desconexión (3 intervalos sin heartbeat = OFFLINE).

## Alternativas descartadas
- **MQTT con TLS (MQTTS)**: Requiere certificados y más RAM en ESP32-S3; los brokers públicos con TLS gratuitos tienen límites restrictivos.
- **WebSocket persistente**: El ecosistema Arduino/ESP32 no tiene soporte nativo estable para WebSocket cliente; añade complejidad de reconexión y heartbeat.
- **SSE (Server-Sent Events)**: El backend enviaría eventos, pero el ESP32-S3 no tiene parser SSE nativo en Arduino; requeriría implementación manual.
- **gRPC**: Sobredimensionado; overhead de protobuf en microcontrolador sin beneficio real para 4 canales SSR.
- **CoAP**: No hay librerías maduras y ampliamente probadas en el ecosistema ESP32 Arduino.
- **Mantener broker MQTT privado (Mosquitto Docker)**: Infraestructura adicional sin ventaja frente a HTTP polling directo para el volumen actual de nodos (< 10).

## Detalle técnico

### Endpoints REST (protocolo v2.0.0)

| Método | Endpoint | Dirección | Propósito |
|--------|----------|-----------|-----------|
| `POST` | `/api/v1/telemetry` | FW → BE | Lecturas de sensores |
| `GET` | `/api/v1/actuators?deviceId={id}` | FW ← BE | Estados deseados y comandos pendientes |
| `POST` | `/api/v1/commands/{cmdId}/ack` | FW → BE | Confirmación de comando ejecutado |
| `POST` | `/api/v1/device/{id}/heartbeat` | FW → BE | Heartbeat y estado online |
| `POST` | `/api/v1/telemetry/batch` | FW → BE | Telemetría en lote (modo recuperación) |

### Telemetría (firmware → backend)

**Request**: `POST /api/v1/telemetry`
```json
{
  "protocol": "2.0.0",
  "deviceId": "mush2_s3_001",
  "ts": 1718366400,
  "sensors": {
    "temperature": 22.3,
    "humidity": 88.5,
    "co2": 750,
    "voc": 120
  },
  "status": {
    "state": "NORMAL",
    "mode": "LOCAL",
    "uptime": 3600,
    "wifiRssi": -45,
    "fwVersion": "1.0.0"
  }
}
```
**Response**: `202 Accepted`
```json
{ "status": "accepted" }
```

### Comandos de actuadores (backend → firmware)

**Request**: `GET /api/v1/actuators?deviceId=mush2_s3_001`

**Response**:
```json
{
  "deviceId": "mush2_s3_001",
  "ts": 1718366400,
  "pollInterval": 3000,
  "commands": [
    {
      "cmdId": "cmd_1718366400123",
      "target": "actuator",
      "channel": 1,
      "command": "ON"
    }
  ],
  "actuators": [
    { "channel": 1, "state": "ON",  "mode": "REMOTE" },
    { "channel": 2, "state": "OFF", "mode": "LOCAL" },
    { "channel": 3, "state": "OFF", "mode": "LOCAL" },
    { "channel": 4, "state": "OFF", "mode": "LOCAL" }
  ]
}
```

- `commands`: Array de comandos pendientes (vacío si no hay). El firmware debe ejecutar **todos** antes del próximo poll.
- `actuators`: Estado deseado actual de cada canal (siempre presente). El firmware aplica REMOTE override cuando `mode` es `REMOTE`.
- `pollInterval`: Sugerencia del backend para el siguiente intervalo de polling (permite control adaptativo desde servidor).

### Confirmación de comando (firmware → backend)

**Request**: `POST /api/v1/commands/cmd_1718366400123/ack`
```json
{
  "deviceId": "mush2_s3_001",
  "ts": 1718366401,
  "status": "OK",
  "actuatorState": { "channel": 1, "state": "ON" }
}
```

**Códigos de estado**:
| Código | Significado |
|--------|-------------|
| `OK` | Comando ejecutado correctamente |
| `INVALID_CHANNEL` | Canal fuera de rango (1–4) |
| `INVALID_STATE` | Estado no válido |
| `BUSY` | Mínimo tiempo ON no cumplido |
| `UNKNOWN_CMD` | Comando no reconocido |
| `ALREADY_EXECUTED` | `cmdId` ya ejecutado (respuesta segura para duplicados) |

### Heartbeat

**Request**: `POST /api/v1/device/mush2_s3_001/heartbeat`
```json
{
  "ts": 1718366400,
  "uptime": 3600,
  "wifiRssi": -45,
  "state": "NORMAL"
}
```
**Response**: `200 OK` — El backend actualiza `lastSeen` del dispositivo. Si no recibe heartbeat en 3 intervalos consecutivos (~9s), marca el dispositivo como `OFFLINE`.

### Flujo completo

```
Boot del firmware:
  → POST /api/v1/device/{id}/heartbeat  (estado BOOT)
  → Inicia loop de telemetría y polling

Cada 10s (SENSOR_INTERVAL):
  → POST /api/v1/telemetry  (lecturas de sensores)

Cada POLL_INTERVAL (adaptativo 3–30s):
  → GET /api/v1/actuators?deviceId={id}
  → Si hay commands[]: ejecutar secuencialmente
    → POST /api/v1/commands/{cmdId}/ack  por cada uno
  → Si actuators[].mode = REMOTE: override SSR con state deseado
  → Si no hay cambios: continuar con control LOCAL por histéresis

Usuario enciende actuador desde frontend:
  Frontend → PATCH /api/v1/devices/{id}/actuators/{channel}
    → Backend actualiza Actuator row en DB
    → Backend encola comando en command_queue
    → Firmware pollea → recibe comando en commands[]
    → Ejecuta SSR físicamente
    → Envía POST /api/v1/commands/{cmdId}/ack
    → Backend marca comando COMPLETED
    → Backend envía SSE al frontend (evento 'ack')

ControlEngine automatizado (backend, cada 60s):
  → Evalúa última telemetría vs setpoints de receta
  → Calcula comandos por histéresis
  → Encola comandos en command_queue
  → Firmware los recoge en siguiente poll
```

### Polling adaptativo

| Situación | Intervalo | Mecanismo |
|-----------|-----------|-----------|
| Comandos pendientes | 3s | Backend incluye `pollInterval: 3000` en respuesta |
| Sin comandos (inicio) | 3s | Mínimo inicial |
| Reposo progresivo | 5s → 10s → 20s → 30s | Firmware duplica intervalo tras cada poll vacío |
| Nuevo comando encolado | 3s | Backend notifica vía SSE al frontend (no al firmware); firmware reduce al mínimo en siguiente poll |
| Jitter | ±500ms | Aleatorio en firmware para evitar sincronización |

### Cola de comandos (PostgreSQL)

```sql
CREATE TABLE command_queue (
  id            BIGSERIAL PRIMARY KEY,
  cmd_id        VARCHAR(64) UNIQUE NOT NULL,
  device_id     VARCHAR(64) NOT NULL,
  target        VARCHAR(32) NOT NULL DEFAULT 'actuator',
  channel       INTEGER NOT NULL CHECK (channel BETWEEN 1 AND 4),
  command       VARCHAR(8) NOT NULL CHECK (command IN ('ON','OFF')),
  status        VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','DELIVERED','COMPLETED','FAILED','EXPIRED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_attempt  TIMESTAMPTZ,
  acked_at      TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  error_msg     TEXT
);

CREATE INDEX idx_command_queue_device_status
  ON command_queue (device_id, status);
```

### Seguridad

1. **TLS/HTTPS obligatorio**: Todo el tráfico entre firmware y backend debe ir cifrado.
2. **API Key por dispositivo**: Cada nodo tiene una API key única almacenada en `config.h` y validada por el backend vía header `X-API-Key`.
3. **Rate limiting**: Máximo 1 petición por segundo por dispositivo (configurable).
4. **Validación de schema**: Cada endpoint valida tipos, rangos y campos obligatorios.
5. **JWT para frontend**: El frontend web se autentica con JWT; el firmware no necesita JWT (usa API key).

### Configuración en firmware

```cpp
// config.h — Protocolo HTTP v2
#define BACKEND_HOST      "192.168.1.6"
#define BACKEND_PORT      3797
#define BACKEND_USE_TLS   0              // 1 para HTTPS
#define BACKEND_API_KEY   "sk_mush2_s3_001_abc123def456"
#define POLL_INTERVAL     3000
#define POLL_BACKOFF_MAX  30000
#define HEARTBEAT_INTERVAL 3000
#define COMMAND_TIMEOUT   300000         // 5 minutos
```

### Detección de desconexión

| Mecanismo | Límite | Acción |
|-----------|--------|--------|
| Heartbeat no recibido | 3 intervalos (~9s) | Backend marca dispositivo OFFLINE |
| Polling no recibido | 3 intervalos (~9s) | Backend asume comando no entregado |
| Sin heartbeat + sin polling | 30s | Backend cancela comandos PENDING → EXPIRED |
| Firmware detecta WiFi caído | Inmediato | Estado DEGRADED, reintenta cada 10s hasta 5 veces, luego SAFE |

## Referencias
- Implementación firmware: `firmware-esp32/src/http_poller.h`, `firmware-esp32/src/http_poller.cpp`, `firmware-esp32/src/main.ino`
- Implementación backend: `backend/src/routes/actuators.js`, `backend/src/routes/api.js`, `backend/src/services/controlEngine.js`
- Configuración: `firmware-esp32/src/config.h`
- Contrato API: `docs/contracts/api-contract.md`
- Ver también: ADR-001 (placa ESP32-S3), ADR-004 (ThingSpeak backhaul), ADR-005 (PostgreSQL)
