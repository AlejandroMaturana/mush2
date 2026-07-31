# RFC-0009 — Command & Actuation Protocol

## Metadata

| Campo             | Valor                                        |
| ----------------- | -------------------------------------------- |
| Autor             | ISSUE-030                                    |
| Estado            | ACCEPTED                                     |
| Fecha de apertura | 2026-07-30                                   |
| Fecha de cierre   | 2026-07-31                                   |
| ADR resultado     | ADR-030 (Aceptado)                         |
| RFC relacionados  | RFC-0002 (MQTT v2), ADR-008 (HTTP Command)   |
| EDD relacionados  | EDD-006 (Channel Mapping)                    |

## Resumen

Definir el Command & Actuation Protocol de Mush2: el contrato formal que gobierna cómo se genera, transmite, recibe, ejecuta y confirma un comando de actuación física (SSR) entre el backend y el firmware ESP32-S3, cubriendo los canales MQTT y HTTP, estableciendo invariantes de seguridad, precedencia de fuentes, y el ciclo de vida completo del comando.

## Motivación

Mush2 opera actualmente con dos caminos de comando activos (MQTT publish y HTTP polling) que no comparten un contrato común. Esto produce:

1. **Divergencia semántica**: un mismo actuador puede recibir comandos con formatos distintos según el canal.
2. **Sin trazabilidad**: no existe un identificador único de comando (`cmdId`) que permita rastrear un comando desde su origen hasta su confirmación.
3. **Precedencia no documentada**: el firmware mezcla comandos MQTT, respuestas HTTP y control LOCAL por histéresis sin una política documentada de qué fuente prevalece.
4. **Invariantes en código**: reglas de safety (temp ≥ 32°C), override (5 min LOCAL) y minOnTime (3s SSR) existen solo en implementación, sin contrato formal que las proteja de regresión.
5. **Riesgo REG-001 repetido**: sin invariantes formalizadas, una correción puede reintroducirse silenciosamente en una modificación futura.

Si no se implementa este protocolo, cada nuevo tipo de actuador o canal de comando requerirá decisiones ad-hoc, perpetuando la deuda arquitectónica documentada en ISSUE-030 (H-01 a H-06).

## Diseño detallado

### 1. Pipeline comando → ACK

```
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌───────────┐   ┌──────────┐
│  Source   │   │  Backend  │   │  Channel   │   │  Firmware │   │ Physical │
│ (auto/man)│──>│ (pipeline)│──>│ (MQTT/HTTP)│──>│ (executor)│──>│  SSR     │
└──────────┘   └──────────┘   └───────────┘   └───────────┘   └──────────┘
                                                      │
                                                      v
                                                ┌──────────┐
                                                │  ACK     │
                                                │ (confirm)│
                                                └────┬─────┘
                                                     │
                                                     v
                                                ┌──────────┐
                                                │  Backend │
                                                │ (update) │
                                                └──────────┘
```

#### 1.1 Fuentes de comando (Sources)

| Source | Origen | Medio | Autoridad |
|--------|--------|-------|-----------|
| `auto` | ControlEngine (cada 60s) | EventBus → MQTT + WebSocket | Automática: basada en receta vs telemetría |
| `manual` | Usuario via REST API | PATCH `/devices/:id/actuators/:channel` → MQTT + WS | Manual: requiere autenticación JWT |
| `diag` | Diagnóstico / test | POST `/diag/mqtt/publish` | Admin: solo para pruebas |

#### 1.2 Pipeline de procesamiento (backend)

```
Source genera comando
     │
     v
1. VALIDAR source autorizado
     │
     v
2. EVALUAR invariantes de pre-comando (ver §3)
     │
     v
3. GENERAR cmdId
     │
     v
4. REGISTRAR outgoing (recordOutgoing → lastCommandAt)
     │
     v
5. PUBLICAR por canal(es):
     ├── MQTT: publishActuatorCommand() a topic actuator
     └── HTTP: disponible en GET /api/v1/actuators (próximo poll)
     │
     v
6. ESPERAR confirmación (ACK del firmware, timeout TBD)
     │
     ├── ACK recibido → cmd COMPLETED, lastAckAt actualizado
     └── Timeout → cmd EXPIRED, alarma opcional
```

#### 1.3 Pipeline de recepción (firmware)

```
MQTT message recibido   HTTP response recibido
     │                         │
     v                         v
1. PARSEAR payload vs formato canónico (§2)
     │
     v
2. EXTRAER cmdId, command{type, channel, value}, source
     │
     v
3. VERIFICAR si cmdId ya fue ejecutado (deduplicación)
     │
     ├── Ya ejecutado → ignorar, ACK = ALREADY_EXECUTED
     └── Nuevo → continuar
     │
     v
4. APLICAR precedencia de fuentes (§4)
     │
     v
5. EJECUTAR comando en SSR (ssrController.setChannel)
     │
     v
6. PUBLICAR ACK (MQTT topic ack)
```

### 2. Ciclo de vida del comando

#### 2.1 Estados

```
PENDING
  │
  v
DELIVERED ──→ COMPLETED
  │               │
  │               │ (ACK recibido, ejecución OK)
  │               │
  ├──→ FAILED     │ (ACK recibido, ejecución con error)
  │               │
  └──→ EXPIRED    │ (timeout sin ACK)
                  │
                  v
              [terminal]
```

| Estado | Significado | Transiciones válidas |
|--------|-------------|---------------------|
| `PENDING` | Comando generado pero aún no transmitido | → DELIVERED |
| `DELIVERED` | Comando transmitido al menos una vez por un canal | → COMPLETED, FAILED, EXPIRED |
| `COMPLETED` | ACK recibido con status OK | Terminal |
| `FAILED` | ACK recibido con status de error | Terminal |
| `EXPIRED` | Timeout sin ACK (TBD segundos) | Terminal |

#### 2.2 Eventos de transición

| Transición | Disparador | Acciones |
|------------|------------|----------|
| PENDING → DELIVERED | Publicación MQTT exitosa O respuesta HTTP con comando pendiente | `recordOutgoing(deviceId)`, `lastCommandAt = now` |
| DELIVERED → COMPLETED | ACK recibido con `status: OK` | `recordIncoming(deviceId, 'ack')`, `lastAckAt = now`, evento `ack` SSE |
| DELIVERED → FAILED | ACK recibido con `status: error_code` | `recordIncoming(deviceId, 'ack')`, evento `ack` con error |
| DELIVERED → EXPIRED | Timeout sin ACK (configurable por tipo de comando) | Alarma opcional, evento `command_expired` |

#### 2.3 Consideraciones de implementación

- **cmdId**: generado por el backend como **UUID v4** (ADR-030 §2). El firmware lo usa exclusivamente para deduplicación y ACK; no debe generarlo.
- **Timeout**: valor inicial sugerido 30s para comandos MQTT (incluye latencia de red + polling). Configurable por dispositivo.
- **Deduplicación**: el firmware debe mantener un conjunto acotado de `cmdId` ejecutados recientemente (anillo circular de N=16) para detectar duplicados.
- **Idempotencia**: un comando COMPLETED no debe reejecutarse si el mismo cmdId llega por otro canal.

### 3. Invariantes de actuación

#### 3.1 Pre-comando (evaluadas antes de transmitir)

| ID | Invariante | Evaluador | Consecuencia si viola |
|----|-----------|-----------|----------------------|
| INV-001 | Dispositivo debe estar ONLINE (connectivity ≠ OFFLINE) | Backend pipeline | Comando no transmitido, error al source |
| INV-002 | Dispositivo no debe estar en MAINTENANCE ni RETIRED | Backend pipeline | Comando no transmitido, error al source |
| INV-003 | El actuador no debe estar en LOCAL mode con override activo | Backend pipeline | Comando diferido hasta timeout del override |
| INV-004 | La temperatura no debe exceder umbral crítico (≥ 32°C) si el comando enciende calefacción | Backend pipeline | Comando rechazado, alarma CRITICAL |
| INV-005 | El comando debe especificar source (auto/manual/diag) | Backend pipeline | Comando rechazado |
| INV-006 | El canal debe estar en rango válido (1-4 para SSR) | Backend pipeline + firmware | Comando rechazado con INVALID_CHANNEL |

#### 3.2 Post-comando (evaluadas después de ejecución)

| ID | Invariante | Evaluador | Consecuencia si viola |
|----|-----------|-----------|----------------------|
| INV-101 | El estado físico del actuador debe coincidir con el comando ejecutado | Firmware (ACK incluye actuadorState) | ACK con FAILED, alarma |
| INV-102 | El tiempo mínimo ON (minOnTime = 3s) debe respetarse | Firmware SSR controller | Comando BUSY si se intenta apagar antes |
| INV-103 | Fail-safe (temp ≥ 32°C) prevalece sobre cualquier comando post-ejecución | Firmware hysteresis + Backend safety guard | Override forzado: vent ON, heat OFF, humid OFF |
| INV-104 | Modo LOCAL override dura máximo 5 min | Backend Actuator.overrideUntil | Restauración automática a REMOTE |

#### 3.3 INV-007 — Command Determinism

| ID | Invariante | Evaluador | Consecuencia si viola |
|----|-----------|-----------|----------------------|
| INV-007 | Un mismo comando lógico (mismo `cmdId`, mismo `channel`, mismo `state`) debe producir el mismo resultado observable independientemente del canal (MQTT, HTTP, REST) | Contract tests entre canales | El protocolo debe garantizar que el formato y semántica del comando sean invariantes. Cualquier diferencia entre canales se considera breaking change |

### 4. Precedencia de fuentes

#### 4.1 Orden de precedencia (de mayor a menor)

| Precedencia | Fuente | Condición | Efecto |
|-------------|--------|-----------|--------|
| 1 (máxima) | **Fail-safe** (temp ≥ 32°C) | Temperatura crítica detectada por firmware o backend | Override forzado: vent ON, heat OFF, humid OFF. Ignora cualquier otro comando |
| 2 | **Override LOCAL manual** | Usuario envió PATCH con comando directo. Actuator.mode = LOCAL, overrideUntil activo | El actuador ignora comandos REMOTE hasta timeout (5 min) o cancelación |
| 3 | **Comando REMOTE automático** (ControlEngine) | ControlEngine computa comandos cada 60s basado en receta | Se aplica SOLO si no hay override LOCAL activo y no hay fail-safe |
| 4 | **Comando REMOTE manual** (API usuario) | Usuario envía PATCH sin override (REMOTE mode) | Misma precedencia que auto. El último comando recibido prevalece |
| 5 (mínima) | **Control LOCAL por histéresis** | Firmware opera en LOCAL mode sin conexión o por defecto | Se aplica solo cuando no hay comandos REMOTE pendientes |

#### 4.2 Reglas de precedencia

| Regla | Descripción |
|-------|-------------|
| PREC-001 | Fail-safe (INV-103) tiene la máxima precedencia. No puede ser anulado por ningún otro comando |
| PREC-002 | Un actuador en modo LOCAL (override manual) ignora todos los comandos REMOTE, incluidos los del ControlEngine |
| PREC-003 | El timeout del modo LOCAL es 5 minutos desde el último comando manual. Al expirar, el actuador vuelve a REMOTE |
| PREC-004 | Entre comandos REMOTE (auto y manual), el último recibido prevalece. No hay jerarquía entre auto y manual en REMOTE |
| PREC-005 | El control LOCAL por histéresis se aplica solo cuando no hay override REMOTO activo y no hay fail-safe |
| PREC-006 | El firmware es la autoridad final del estado físico. El backend nunca sobrescribe el estado reportado por el firmware |

### 5. Formato canónico del comando

> El formato canónico es la **única fuente de verdad** del wire contract. El schema normativo vive en `docs/contracts/conformance/schemas/command.schema.json` y `ack.schema.json` (contrato congelado, validado por `backend/src/__tests__/contract/conformance.test.js`). Este §5 es la especificación de alto nivel; el schema prevalece.

#### 5.1 Comando (MQTT topic: `mush2/{deviceId}/actuators`, QoS 1)

Un comando por mensaje (formato **anidado unario**). Deduplicación por `cmdId` en firmware.

```json
{
  "cmdId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source": "backend.controlEngine",
  "ts": 1718366400,
  "command": {
    "type": "ACTUATOR_SET",
    "channel": 2,
    "value": true
  },
  "setpoints": {
    "tempMin": 20.0,
    "tempMax": 24.0,
    "humMin": 78.0,
    "humMax": 85.0,
    "co2Max": 1200
  },
  "phase": "INCUBATION"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `cmdId` | string (UUID v4) | sí | Identificador único del comando, generado en backend (ADR-030 §2) |
| `source` | string | sí | Origen: `backend.controlEngine`, `api.manual`, `diag` |
| `ts` | number | sí | Timestamp Unix seconds del momento de generación (ADR-026) |
| `command.type` | string | sí | Tipo de comando: solo `ACTUATOR_SET` definido |
| `command.channel` | number | sí | Canal (1-4 según EDD-006: 1=VENTILATION, 2=HEATER, 3=HUMIDIFIER, 4=LIGHT) |
| `command.value` | boolean | sí | Estado deseado: `true`=ON, `false`=OFF |
| `setpoints` | object | no | Setpoints de fase activa (para sincronización y operación LOCAL) |
| `phase` | string | no | Fase activa del ciclo (para sincronización) |

#### 5.2 ACK (MQTT topic: `mush2/{deviceId}/ack`)

Un ACK por comando recibido. El firmware responde siempre, incluso ante comandos desconocidos o canales inválidos.

```json
{
  "cmdId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channel": 2,
  "state": true,
  "status": "OK",
  "ts": 1718366401
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `cmdId` | string (UUID v4) | sí | Mismo cmdId del comando que se confirma |
| `channel` | number | sí | Canal 1-4. `0` solo para errores de parseo (UNKNOWN_CMD/INVALID_CHANNEL) |
| `state` | boolean | sí | Estado ejecutado/confirmado: `true`=ON, `false`=OFF |
| `status` | string | sí | `OK`, `INVALID_CHANNEL`, `INVALID_STATE`, `BUSY`, `UNKNOWN_CMD`, `ALREADY_EXECUTED` |
| `ts` | number | sí | Timestamp Unix seconds de la confirmación (ADR-026) |

#### 5.3 HTTP polling response (`GET /api/v1/actuators?deviceId={id}`)

Respuesta actual del fallback HTTP (routes/actuators.js). No transporta `commands[]`: la cola persistente (H-103) está diferida. HTTP entrega estado deseado y setpoints; la confirmación física requiere ACK MQTT (ADR-030-08).

```json
{
  "status": "active",
  "deviceId": "mush2_s3_001",
  "cycleId": 1,
  "phase": "INCUBATION",
  "setpoints": {
    "tempMin": 20.0,
    "tempMax": 24.0,
    "humMin": 78.0,
    "humMax": 85.0,
    "co2Max": 1200
  },
  "ssrActiveLow": true,
  "actuators": [
    { "channel": 1, "state": "ON",  "mode": "REMOTE" },
    { "channel": 2, "state": "OFF", "mode": "REMOTE" },
    { "channel": 3, "state": "OFF", "mode": "REMOTE" },
    { "channel": 4, "state": "OFF", "mode": "LOCAL" }
  ]
}
```

- `actuators`: estado deseado actual (incluye mode LOCAL/REMOTE para que el firmware sepa si debe obedecer)
- `setpoints`: umbrales de la fase activa (para que el firmware pueda operar en LOCAL si pierde conexión)
- `ssrActiveLow`: flag de polaridad del SSR, obtenido del modelo Device
- `commands`: NO presente — array de comandos pendientes diferido (H-103, command_queue)

### 6. Compatibilidad con firmware legacy

#### 6.1 Formato MQTT dual-format (canónico + legacy)

Durante la transición el parser de `firmware/src/mqtt_client.cpp` acepta **dos formatos** en el topic `mush2/{deviceId}/actuators` (RFC-0009 §6, implementado en Fase 4B):

| Formato | Detección | Comportamiento |
|---------|-----------|----------------|
| **Canónico** (§5.1) | Presencia del objeto `command` | Dedup por `cmdId` (ring N=16) + ACK obligatorio (OK / INVALID_CHANNEL / UNKNOWN_CMD / ALREADY_EXECUTED) |
| **Legacy** (`actuators[]` array) | Presencia del array `actuators` | Ejecuta sin dedup ni ACK (comportamiento previo al protocolo) |

El backend publica exclusivamente el formato canónico. El formato legacy se mantiene únicamente para compatibilidad con emisores pre-transición y se eliminará cuando se retire el parser dual.

**Riesgo identificado (cerrado)**: el parser dual asume que un payload con `command` es canónico; el formato legacy nunca incluye la clave `command`, por lo que la detección es inequívoca.

#### 6.2 Formato HTTP backward-compatible

La respuesta HTTP definida en §5.3 es compatible con el parser actual en `firmware/src/http_poller.cpp`:

| Campo del protocolo | Parser actual | Compatible |
|---------------------|---------------|------------|
| `actuators` array | Parseado por `applyActuators()` | ✅ |
| `setpoints` | Parseado si presente | ✅ |
| `ssrActiveLow` | Parseado correctamente | ✅ |
| `phase` | Parseado si presente | ✅ |

**Riesgo identificado**: HTTP es solo fallback y no transporta comandos pendientes (H-103 diferido). La confirmación física de un comando MQTT siempre llega vía ACK MQTT.

#### 6.3 Período de transición

| Fase | Canales activos | Formato | Estado |
|------|----------------|---------|--------|
| 1 — Actual | MQTT + HTTP | Legacy (`actuators[]` array) | Histórico |
| 2 — Protocolo publicado | MQTT primario + HTTP fallback | Canónico (§5.1) publicado por backend; firmware dual-format | **ACTUAL** (Fase 4A/4B) |
| 3 — Legacy deprecado | MQTT primario, HTTP fallback | Firmware solo canónico (se retira parser legacy) | Futuro (tras verificación hardware de 4B) |
| 4 — Final | Solo MQTT | Canónico | Futuro (cuando HTTP fallback se retire) |

### 7. Trazabilidad

| Qué se registra | Dónde | Cuándo | Propósito |
|----------------|-------|--------|-----------|
| `lastCommandAt` | Device model (DB) | Al publicar comando (recordOutgoing) | Saber cuándo se intentó el último comando |
| `lastAckAt` | Device model (DB) | Al recibir ACK (recordIncoming) | Saber cuándo se confirmó el último comando |
| `cmdId` | En log de eventos | Al generar comando y al recibir ACK | Trazar comando específico |
| Source | En log de eventos | Al generar comando | Saber quién originó el comando |
| Canal + estado | En log de eventos | Al generar y al confirmar | Detectar discrepancias entre comando y ACK |

## Alternativas consideradas

| Opción | Pros | Contras | Descartado por |
|--------|------|---------|----------------|
| **Formato único MQTT (sin HTTP)** | Simple, un solo canal | Rompe compatibilidad con firmware que solo usa HTTP polling | Impacto en firmware legacy en campo |
| **CmdId solo en backend** | Sin cambios en firmware | No hay deduplicación real; el firmware no puede detectar duplicados | No resuelve el problema de QoS 1 duplicados |
| **Pipeline síncrono (ACK obligatorio antes de próximo comando)** | Trazabilidad estricta | Aumenta latencia; complejidad de estado | Sobredimensionado para 4 canales SSR con histéresis |
| **Protocolo sin versionado** | Menos campos en payload | Imposible evolucionar sin breaking change | Violación de ADR-019 (evolución incremental) |

## Impacto en compatibilidad

| Componente | Impacto | Mitigación |
|------------|---------|------------|
| Backend `mqttBridge.js` | Medio — publica formato canónico unario por comando (§5.1) y maneja ACK (§5.2) | Implementado (Fase 4A) |
| Backend `routes/actuators.js` | Bajo — la respuesta HTTP mantiene `actuators` array + setpoints (§5.3); `commands` array diferido | Compatible con parser HTTP actual |
| Backend `controlEngine.js` | Bajo — los comandos se emiten con `cmdId` y `source` | Implementado (Fase 4A) |
| Backend `deviceHealthService.js` | Sin cambios — ya implementa `recordIncoming`/`recordOutgoing` | Ya compatible con ADR-026 |
| Firmware `mqtt_client.cpp` _onMessage | Medio — parser dual-format: canónico (dedup + ACK) y legacy (transición) | Implementado (Fase 4B) |
| Firmware `http_poller.cpp` runParse | Sin cambios — el response §5.3 no agrega campos incompatibles | Compatible |
| Firmware `tasks.cpp` mqttActuatorCallback | Bajo — la precedencia ya está implementada vía `actuatorMode[]` | La lógica actual es consistente con PREC-001 a PREC-006 |
| Mosquitto ACLs | Sin cambios | Los topics y patrones se mantienen |
| API REST | Bajo — `PATCH /actuators/:channel` debe incluir `source: "manual"` en el evento interno | Backward compatible |

## Plan de migración

1. **Publicar RFC-0009**: documento en estado DRAFT para revisión.
2. **Revisión y Architecture Decision Gate**: según FASE 3.5 de ISSUE-030.
3. **Si Accepted**: crear ADR-XXX + actualizar backend para incluir `cmdId` y `source` en el pipeline.
4. **Migración de firmware**: en próxima OTA, actualizar parser MQTT para usar `cmdId` en deduplicación.
5. **HTTP polling**: mantener como fallback. El array `commands` se agrega al response cuando haya comandos pendientes sin ACK.
6. **Período de coexistencia**: mínimo 2 releases de firmware (actual → nuevo formato con compatibilidad → solo nuevo formato).

Los cambios son incrementalmente desplegables y cada etapa mantiene compatibilidad con el firmware existente.

## Preguntas abiertas

1. **¿cmdId exacto?** **RESUELTA** — UUID v4 generado en backend (ADR-030 §2). Descartados el formato compacto `cmd_{deviceId}_{ts}_{seq}` (requiere contador secuencial) y el hash del payload (no trazable).
2. **¿Timeout de EXPIRED?** Valor sugerido 30s para MQTT. ¿Debe ser configurable por dispositivo o global? — **Abierta** (H-105, posterior a la implementación)
3. **¿Historial de comandos?** La tabla `command_queue` definida en ADR-008 pero nunca creada. — **Diferida** (H-103)
4. **¿ACK obligatorio para todos los canales?** Un comando enviado por MQTT genera ACK. Un comando leído por HTTP polling: ¿genera ACK también? — **Abierta**; HTTP fallback no confirma físicamente (ADR-030-08)
5. **¿Channel mapping semántico?** **RESUELTA Y CERRADA** por EDD-006 (`docs/EDD/EDD-006-mapeo-canales-actuadores.md`). Mapeo canónico: CH1=VENTILATION, CH2=HEATER, CH3=HUMIDIFIER, CH4=LIGHT. Este RFC adopta ese mapeo como fuente de verdad. Ver EDD-006 para tabla completa, ActuatorType, invariantes y contrato entre capas.
6. **¿Relación con RFC-0002 (MQTT v2)?** RFC-0002 está en DRAFT desde 2026-07-19 y describe infraestructura MQTT que intersecta con este protocolo. ¿Se integran las decisiones o se mantienen separadas? — **Abierta**; ADR-030 §Consecuencias documenta la actualización futura de RFC-0002

## Comentarios del equipo

> *Los comentarios se agregan aquí durante el período de REVIEW.*

## Decisión

**Estado final:** ACCEPTED

**Justificación:**

> Aprobado por Architecture Decision Gate (ISSUE-030 FASE 3.5). El formato canónico definitivo es el **anidado unario** de §5.1/§5.2, con el schema congelado de `docs/contracts/conformance/` como fuente normativa única del wire contract (decisión Fase 4D de ISSUE-030).

**ADR generado:** ADR-030 (Aceptado)

## Historial de Cambios

| Versión | Fecha      | Autor            | Cambios |
|---------|------------|------------------|---------|
| 1.0     | 2026-07-24 | AlejandroMaturana | Creación del documento (DRAFT) |
| 2.0     | 2026-07-31 | AlejandroMaturana | ACCEPTED; formato canónico anidado unario (§5.1/§5.2); cmdId UUID v4 (§2.3); §5.3 HTTP sin `commands[]`; §6 dual-format firmware; schemas conformance como fuente normativa (Fase 4D ISSUE-030) |
