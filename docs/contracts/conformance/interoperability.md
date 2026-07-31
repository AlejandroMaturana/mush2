# Casos de Interoperabilidad — Conformance MQTT

> Escenarios que la Simulation Platform (FASE 1+) debe poder ejecutar y validar. Cada caso describe la secuencia esperada de mensajes conforme al contrato. Los casos I-01 a I-05 son verificables con el Protocol Simulator (FASE 1).

| ID | Caso | Secuencia esperada | Payloads | Validación |
|----|------|--------------------|----------|------------|
| I-01 | Registro y conexión | `POST /api/v1/devices/register` → credenciales MQTT → connect → `status` online retained | `status.schema.json` (online) | El backend ve el dispositivo conectado (`lastSeen`) |
| I-02 | Telemetría periódica | Publicar telemetría cada N s → backend persiste 5 filas → SSE `telemetry` | `telemetry.schema.json` | Backend recibe en `mush2/+/telemetry` |
| I-03 | Status periódico | Publicar status FSM → backend actualiza `lastFirmwareState`/`controlMode` | `status.schema.json` (NORMAL) | Estado del dispositivo consistente |
| I-04 | Comando → ACK | Backend publica comando en `mush2/{id}/actuators` → simulador valida → ACK canónico en `mush2/{id}/ack` | `command.schema.json` → `ack.schema.json` | Backend recibe ACK (`lastAckAt`, SSE `ack`) |
| I-05 | Desconexión y LWT | Cerrar conexión abrupta → broker publica LWT retained | `lwt.schema.json` | Backend marca `OFFLINE` |
| I-06 | Reconexión | Reconectar → `status` online retained sobrescribe LWT | `status.schema.json` | Dispositivo vuelve a ONLINE |
| I-07 | Health periódico | Publicar health → backend persiste `DeviceHealth` | `health.schema.json` | Backend recibe en `mush2/+/health` |
| I-08 | Alarma | Publicar alarma → backend emite SSE `alarm` | `alarm.schema.json` | Frontend recibe evento |
| I-09 | Rechazo de no conformes | Publicar payload divergente (ej. `eco2`, `heap`, comando anidado) → validador lo rechaza | `divergent/*` | El drift es detectado (contract test) |

## Reglas transversales

- Todo payload de los casos I-01 a I-08 debe pasar su schema antes de publicarse.
- `ts` siempre en Unix segundos (ADR-026).
- El simulador opera en el ambiente DEV aislado (ADR-029); los topics conservan `mush2/{deviceId}/...`.
- La misma configuración + misma semilla produce la misma secuencia (determinismo).
