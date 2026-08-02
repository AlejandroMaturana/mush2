# Conformance — Contrato MQTT Mush2 (FASE 0.5)

> **Propósito:** congelar el contrato del wire mediante artefactos verificables antes de escribir cualquier línea del simulador. Estos artefactos son la referencia normativa para backend, firmware y simulador, y la base del futuro `packages/protocol` (RFC-0010, ADR-031).

---

## 1. Estructura

```text
docs/contracts/conformance/
├── README.md                    # Este documento
├── interoperability.md          # Casos de interoperabilidad (I-01 a I-09)
├── schemas/                     # JSON Schemas (draft-07) por tipo de mensaje
│   ├── telemetry.schema.json
│   ├── status.schema.json
│   ├── health.schema.json
│   ├── alarm.schema.json
│   ├── maintenance.schema.json
│   ├── command.schema.json      # Formato canónico ADR-030
│   ├── ack.schema.json          # Formato canónico ADR-030
│   └── lwt.schema.json
└── examples/
    ├── manifest.json            # Casos canónicos (valid) y divergentes (invalid)
    ├── *.json                   # Ejemplos canónicos de payload
    └── divergent/               # Payloads conocidos NO conformes (bloqueados)
```

## 2. Reglas del contrato congelado

1. Todo payload es JSON. El topic identifica el mensaje; el `ts` es Unix **segundos** (ADR-026).
2. `telemetry` requiere `temp`, `hum`, `co2`, `tvoc`, `aqi`, `ts` (los nombres reales del firmware, no `eco2`).
3. `health` usa `freeHeap`/`minFreeHeap`/`maxAllocHeap` y objeto `stack` (no `heap`).
4. `status` admite estados retained (`online`/`offline`) y estados FSM (`NORMAL`, `DEGRADED`, etc.).
5. `command` y `ack` usan el **formato canónico anidado del ADR-030/RFC-0009 §5**: `{ cmdId (UUID v4), source, ts (segundos), command: { type: 'ACTUATOR_SET', channel 1-4, value (boolean) } }` para comando y `{ cmdId, channel, state (boolean), status, ts }` para ACK.
6. El LWT es `{"state":"offline","ts":...}` retained en `mush2/{deviceId}/status`.

## 3. Cómo se ejecuta la validación

Los contract tests viven en `backend/src/__tests__/contract/conformance.test.js`:

```bash
cd backend && pnpm test -- conformance
```

El test carga el `manifest.json`, valida cada ejemplo contra su schema con un validador sin dependencias, y exige:
- Ejemplos canónicos → **válidos**.
- Ejemplos divergentes (en `divergent/`) → **inválidos** (prueba que el drift es detectado).

## 4. Gaps conocidos y decisiones abiertas

El contrato congelado expone divergencias del ecosistema actual. Ninguna se cierra aquí; se registran como deuda a resolver en ISSUEs futuros:

| ID | Gap | Evidencia |
|----|-----|-----------|
| G-2 | El firmware no publica ACK | ACK unario + status OK/INVALID_CHANNEL/UNKNOWN_CMD/ALREADY_EXECUTED, **verificado en hardware (2026-08-01, PASS)** |
| G-3 | El firmware publica con QoS 0 (contrato declara QoS 1) | Auditoría dedicada |
| G-4 | `DEV_ENVIRONMENT.md` documentaba `eco2`/`heap`/`state` numérico; corregido a ejemplos canónicos | Auditoría dedicada H-05 |
| O-1 | `mqtt-contract.md §7.1` exige campos `protocol` y `deviceId` en todo payload; el firmware no los publica | Decidir en ISSUE futuro: exigir o eliminar la cláusula |
| O-2 | `mqtt-contract.md §5.1` define LWT con `status:"OFFLINE"`; el firmware publica `{"state":"offline","ts":0}` | Alinear contrato o firmware |
| O-4 | `getTimestamp()` del firmware usa uptime en segundos cuando NTP no está sincronizado (no época) | El schema exige época; documentado como modo degradado |

## 5. Relación con el simulador (FASE 1)

- El Virtual Device (EDD-007) **debe** publicar solo payloads conformes (validación previa a publish).
- Los schemas de `command`/`ack` son la base para parsear comandos del backend y emitir ACK.
- El simulador nunca es fuente de verdad: cualquier discrepancia se resuelve en el contrato.

## 6. Migración a `packages/protocol`

Cuando se cree `packages/protocol` (RFC-0010), estos schemas, ejemplos y el validador se trasladan al paquete y backend y simulador los importan. Hasta entonces, `docs/contracts/conformance/` es la fuente normativa.
