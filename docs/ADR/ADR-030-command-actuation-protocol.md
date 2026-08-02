# ADR-030: Command & Actuation Protocol

**Estado:** Aceptado

**Fecha:** 2026-07-30

**Autores:** AlejandroMaturana

**Decisores:** Equipo Mush2

---

# Resumen

Se adopta el Command & Actuation Protocol definido en RFC-0009 como el contrato formal que gobierna cómo se genera, transmite, recibe, ejecuta y confirma un comando de actuación física entre el backend y el firmware ESP32-S3. El protocolo establece MQTT como canal primario de comando, HTTP polling como fallback, un cmdId **UUID v4** único por comando, un ciclo de vida de 5 estados (PENDING → DELIVERED → COMPLETED/FAILED/EXPIRED), y una precedencia de 6 niveles con 6 reglas formales. El wire contract canónico (comando anidado unario + ACK unario) se congela en `docs/contracts/conformance/` como única fuente de verdad. Este ADR reemplaza parcialmente ADR-008, que queda obsoleto en sus secciones de comando vía HTTP y abandono de MQTT.

---

# Contexto

## Situación actual

El sistema Mush2 envía comandos de actuación a través de dos caminos activos que no comparten un contrato común:

1. **MQTT publish** (`mqttBridge.js`): el backend publica comandos al tópico `mush2/{deviceId}/actuators`. El firmware recibe y ejecuta.
2. **HTTP polling** (`routes/actuators.js`): el firmware consulta `GET /api/v1/actuators` y recibe estados deseados.

Ambos caminos existen y funcionan, pero presentan:

- **Formatos divergentes**: cada canal tiene su propia estructura de payload
- **Sin cmdId**: no existe identificador único de comando para trazabilidad o deduplicación
- **Precedencia no documentada**: el firmware mezcla fuentes (MQTT, HTTP, control LOCAL) sin política formal
- **Invariantes en código**: reglas de safety y override existen solo en implementación

ADR-008 (HTTP Command Protocol, 2026-06-13) documentó una arquitectura basada exclusivamente en HTTP polling, descartando MQTT. Esa decisión fue superada por la práctica: MQTT fue reintroducido como canal de comando (mqttBridge.js), HTTP polling opera como fallback, y el firmware actual ya usa MQTT en producción.

## Problemas por resolver

| ID | Problema | Origen |
|----|----------|--------|
| H-102 | Canal primario no formalizado (MQTT vs HTTP) | RFC-0009 |
| H-104 | cmdId: formato y autoridad sin definir | RFC-0009 |

## Riesgos de no actuar

- Cualquier cambio futuro en un canal puede asumir incorrectamente que es el único o el principal
- Sin cmdId, no hay trazabilidad ni deduplicación — un comando duplicado puede ejecutarse dos veces
- ADR-008 sigue siendo la documentación oficial pero describe una realidad que ya no existe

---

# Decisión

## 1. Canal primario: MQTT, con HTTP polling como fallback

MQTT es el canal primario de comando. HTTP polling se mantiene como fallback para cuando el firmware no puede conectar al broker MQTT.

| Dimensión | MQTT | HTTP polling |
|-----------|------|-------------|
| Rol | Primario | Fallback |
| Disparo | Push (backend → firmware) | Poll (firmware → backend) |
| Tópico/Endpoint | `mush2/{deviceId}/actuators` | `GET /api/v1/actuators?deviceId={id}` |
| QoS | 1 (al menos una vez) | N/A (consistencia eventual) |
| ACK | Pub `mush2/{deviceId}/ack` | No implementado (implícito en próximo poll) |
| Formato | Schema canónico §5 de RFC-0009 | Schema canónico §5 de RFC-0009 |

**Regla**: todo el pipeline de comando (generación, registro, confirmación) usa el formato canónico de RFC-0009 independientemente del canal de transporte. No existen formatos específicos por canal.

## 2. cmdId: UUID v4

El cmdId se genera en el backend en el momento de crear el comando, antes de publicarlo. Formato: **UUID v4** estándar.

```javascript
const { v4: uuidv4 } = require('uuid');
const cmdId = uuidv4();  // Ej: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Justificación**:
- Garantía de unicidad global sin contexto ni contador secuencial
- Idempotente: una retransmisión del mismo comando conserva el mismo cmdId, permitiendo deduplicación en firmware
- Estándar universal: UUID v4 es reconocido en todos los lenguajes y plataformas del stack (Node.js, C++, PostgreSQL)
- Trazabilidad: el cmdId puede correlacionarse HTTP → MQTT → ACK → estado sin depender de deviceId o timestamp
- Sin estado: no requiere contador secuencial por dispositivo en el backend

**Regla**: el cmdId es generado por el backend y viaja en el payload MQTT/HTTP. El firmware lo usa exclusivamente para deduplicación y ACK. No debe generarse en firmware.

## 3. ADR-008: secciones obsoletas vs vigentes

### Obsoleto (reemplazado por este ADR)

| Sección | Estado | Reemplazado por |
|---------|--------|-----------------|
| "Abandono de MQTT" (párrafos 1-3) | Obsoleto | MQTT es canal primario (§1 de este ADR) |
| Tabla de endpoints: GET /actuators, POST /commands/{cmdId}/ack | Obsoleto en su modelo | RFC-0009 define formato canónico |
| "Reemplazando completamente MQTT" (párrafo inicial) | Obsoleto | La práctica actual usa MQTT |
| Polling adaptativo (3s-30s) | Obsoleto | Firmware actual usa MQTT push; HTTP polling es fallback con intervalo fijo |

### Vigente

| Sección | Estado | Nota |
|---------|--------|------|
| Heartbeat: POST /device/{id}/heartbeat | Vigente | No forma parte del protocolo de comando |
| Telemetría: POST /api/v1/telemetry | Vigente | No forma parte del protocolo de comando |
| Autenticación por API key | Vigente | No forma parte del protocolo de comando; se refiere a HTTP |
| TLS (HTTPS) | Vigente | No forma parte del protocolo de comando |

### Reescribir (ADR futuro)

| Elemento | Acción |
|----------|--------|
| Command queue persistente | Definida en ADR-008 pero nunca implementada. Se difiere a ISSUE futuro (H-103) |
| Polling adaptativo con backoff | Será redefinido si se implementa HTTP como canal de estado |

---

# Justificación

| Problema | Resuelto por |
|----------|-------------|
| Canales sin contrato común | Formato canónico único (RFC-0009 §5) para ambos canales |
| Sin cmdId | cmdId UUID v4 generado en backend |
| ADR-008 describe realidad inexistente | Sección de obsolescencia formal |
| Precedencia no documentada | RFC-0009 §4 (PREC-001 a PREC-006) |
| Invariantes en código | RFC-0009 §3 (INV-001 a INV-104 + INV-007) |
| Channel mapping divergente | EDD-006 (CH1=VENTILATION, CH2=HEATER, CH3=HUMIDIFIER, CH4=LIGHT) |

---

# Alternativas consideradas

## A. cmdId como formato compacto (`cmd_{deviceId}_{ts}_{seq}`)

| Pros | Contras |
|------|---------|
| Trazabilidad intrínseca (deviceId + timestamp visibles) | Requiere contador secuencial por dispositivo en backend |
| Determinista | Más complejo de implementar que UUID estándar |
| **Decisión: ❌ Descartado** — UUID v4 ofrece misma unicidad con cero estado y es estándar multiplataforma |

## B. cmdId como hash del payload

| Pros | Contras |
|------|---------|
| Deduplicación natural (mismo payload = mismo cmdId) | Colisiones posibles (hash truncado) |
| No requiere contador secuencial | No trazable sin conocer el payload original |
| | Cambio mínimo en el payload cambia el cmdId |
| **Decisión: ❌ Descartado** — no es trazable sin el payload completo |

## C. HTTP como canal único (ADR-008 original)

| Pros | Contras |
|------|---------|
| Un solo canal, simplicidad operativa | Ya no es la realidad del sistema |
| Sin broker MQTT que mantener | Mayor latencia (~3s vs push) |
| | Mayor consumo de CPU/batería por polling |
| **Decisión: ❌ Descartado** — la práctica actual y el firmware implementado ya usan MQTT |

## D. MQTT como canal único, eliminar HTTP

| Pros | Contras |
|------|---------|
| Menor latencia, menos código | Sin fallback si el broker cae |
| | Firmware ya implementa ambos |
| **Decisión: ❌ Descartado** — HTTP polling como fallback es necesario para modo DEGRADED |

---

# Consecuencias

## Positivas

- Contrato único para ambos canales de comando
- Trazabilidad completa vía cmdId
- Formalización de la precedencia elimina ambigüedad en el firmware
- ADR-008 queda con obsolescencia documentada en lugar de silenciosa

## Negativas

- El formato canónico debe implementarse en ambos lados del pipeline
- El wire contract queda congelado en `docs/contracts/conformance/`; cualquier cambio debe pasar por los schemas y sus conformance tests
- HTTP polling como fallback tiene un ACK débil (no implementado explícitamente)

## Documentación pendiente

RFC-0002 (MQTT v2) requiere actualización futura para reflejar:
- El firmware actual ya utiliza MQTT (contradice la suposición de RFC-0002 §"Impacto en firmware")
- El tópico canónico debe alinearse con ADR-030: `mush2/{deviceId}/actuators`
- QoS 1 para comandos debe quedar formalizado en RFC-0002

Esto no bloquea ADR-030. RFC-0009 es independiente de RFC-0002.

## Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Firmware no implementa cmdId en la primera iteración | Alta | Bajo | cmdId se genera siempre en backend; firmware dual-format lo ignora en payloads legacy (transición) |
| HTTP fallback queda sin ACK | Media | Bajo | El próximo poll reemplaza el estado completo; el ACK explícito es deseable pero no bloqueante |
| Parser dual-format mal detecta el formato | Baja | Alto | Detección por presencia de clave `command` (inequívoca: legacy nunca la incluye) |

---

# Impacto en la arquitectura

| Componente | Impacto |
|------------|---------|
| Firmware — MQTT handler | Agregar deduplicación por cmdId en `mqttActuatorCallback` |
| Firmware — HTTP poller | El response de polling adopta formato canónico (RFC-0009 §5) |
| Firmware — ACK | Publicar ACK MQTT al recibir comando |
| Backend — mqttBridge.js | Agregar cmdId y source al payload antes de publicar; manejar ACK |
| Backend — routes/actuators.js | Response en formato canónico |
| Backend — controlEngine.js | Comandos generados con cmdId |
| Backend — models/Actuator.js | Agregar cmdId y lastAckAt a la tabla |
| Backend — command_queue | Pendiente de decisión (H-103) |
| Docs — ADR-008 | Marcar secciones obsoletas según §3 de este ADR |

---

# Reglas derivadas

| ID | Regla |
|----|-------|
| ADR-030-01 | Todo comando de actuación debe incluir `cmdId`, `source`, `ts` y `command` (`type`, `channel`, `value`), según el schema conformance (`command.schema.json`) |
| ADR-030-02 | El cmdId se genera exclusivamente en el backend como UUID v4 |
| ADR-030-03 | MQTT es el canal primario de comando. HTTP polling es fallback. Ambos usan el mismo formato canónico |
| ADR-030-04 | El firmware no debe generar cmdId. Solo lo usa para deduplicación y ACK |
| ADR-030-05 | El pipeline de comando debe respetar PREC-001 a PREC-006 (RFC-0009 §4) |
| ADR-030-06 | El pipeline de comando debe respetar INV-001 a INV-104 + INV-007 (RFC-0009 §3) |
| ADR-030-07 | El channel mapping canónico es el definido en EDD-006: CH1=VENTILATION, CH2=HEATER, CH3=HUMIDIFIER, CH4=LIGHT |
| ADR-030-08 | HTTP polling no confirma ejecución física del comando. Entrega estado deseado; la confirmación requiere ACK MQTT o mecanismo futuro equivalente |

---

# Implementación

## Pipeline de comando

```
Backend:
  1. Validar invariantes (INV-001 a INV-006)
  2. Generar cmdId (UUID v4)
  3. Registrar comando en DB (actuators.lastCommandAt, cmdId)
  4. Publicar MQTT: mush2/{deviceId}/actuators (QoS 1)
  5. Esperar ACK en mush2/{deviceId}/ack
  6. Timeout → marcar EXPIRED

Firmware:
  1. Recibir mensaje MQTT
  2. Parsear payload canónico
  3. Validar cmdId vs ring buffer (dedup)
  4. Aplicar precedencia (PREC-001 a PREC-006)
  5. Ejecutar actuador vía SSR
  6. Publicar ACK: mush2/{deviceId}/ack
```

## Formato canónico (MQTT command)

> Normativo: `docs/contracts/conformance/schemas/command.schema.json` (única fuente de verdad del wire contract.

```json
{
  "cmdId": "6f0f2c2c-2c35-4f6d-9e5c-2a1f3b4d5e6f",
  "source": "auto",
  "ts": 1785340800,
  "command": {
    "type": "ACTUATOR_SET",
    "channel": 1,
    "value": true
  },
  "setpoints": {
    "tempMin": 20.0,
    "tempMax": 24.0,
    "humMin": 78.0,
    "humMax": 85.0,
    "co2Max": 1200
  },
  "phase": {
    "type": "INCUBATION",
    "lightCycleHours": 18
  }
}
```

## Formato canónico (MQTT ACK)

> Normativo: `docs/contracts/conformance/schemas/ack.schema.json`.

```json
{
  "cmdId": "6f0f2c2c-2c35-4f6d-9e5c-2a1f3b4d5e6f",
  "channel": 1,
  "state": true,
  "status": "OK",
  "ts": 1785340810
}
```

---

# Validación

- Simular envío de comando MQTT → verificar ACK recibido
- Verificar que cmdId duplicado es ignorado por firmware
- Verificar que el payload MQTT y el ACK validan contra los schemas conformance (conformance tests)
- Verificar que cmdId duplicado es ignorado por firmware
- Verificar que precedencia LOCAL sobreescribe REMOTE (PREC-004)
- Verificar que fail-safe activa CH1 y desactiva CH2 (INV-102)

---

# ADR relacionados

- ADR-008 — Reemplazado parcialmente por este ADR (§3 define obsolescencia)
- ADR-021 — Control Engine como orquestador (genera comandos que este protocolo transporta)
- ADR-025 — Device Status Policy (el estado del dispositivo afecta qué comandos se envían)
- ADR-026 — Temporal Contract (gobierna timestamps en el pipeline)
- ADR-028 — Per-Device MQTT Identity (habilita cmdId por dispositivo)

# EDD relacionados

- EDD-006 — Channel Mapping Canónico (CH1=VENTILATION, GPIO mapping)

# RFC relacionados

- RFC-0009 — Command & Actuation Protocol (especificación completa adoptada por este ADR)
- RFC-0002 — MQTT v2 (infraestructura MQTT, independiente del protocolo de comando)

---

# Referencias

- `docs/RFC/RFC-0009-command-actuation-protocol.md` — Especificación completa del protocolo
- `docs/EDD/EDD-006-mapeo-canales-actuadores.md` — Channel mapping canónico
- `docs/ADR/ADR-008-HTTP-Command-Protocol.md` — ADR reemplazado parcialmente
- `ISSUE#160-command-actuation-protocol` — ISSUE de origen

---

# Historial

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-07-30 | Creación |
| 1.1 | 2026-07-31 | Formato canónico anidado unario; schemas conformance como fuente normativa; se elimina cmdId compacto |
