# AUDIT-001: Simulation Platform — Auditoría del ecosistema

**Fecha:** 2026-07-30
**Método:** inspección de código, documentación, configuración y tests. Sin modificaciones al repositorio.
**Propósito:** evidencia técnica que sustenta el ISSUE-031 (Simulation Platform).
**Alcance:** backend, firmware, frontend, infraestructura, documentación y gobernanza.

---

## 1. Resumen ejecutivo

Mush2 es un monorepo **pnpm** con cuatro paquetes (`frontend`, `backend`, `firmware`, `docs`). No existen aún `apps/` ni `packages/` en el workspace. La validación end-to-end depende de hardware físico (ESP32-S3): no hay infraestructura reproducible para ejercitar el contrato MQTT sin dispositivos reales.

La auditoría confirma **contract drift real entre contrato documentado, backend, firmware y guías de desarrollo**, con consecuencias directas sobre cualquier consumidor nuevo del broker (como la Simulation Platform). El hallazgo más severo: **el comando MQTT publicado por el backend no es parseable por el firmware**.

---

## 2. Estado del workspace

| Elemento | Estado |
|----------|--------|
| `pnpm-workspace.yaml` | Packages: `frontend`, `backend`, `firmware`, `docs`. Sin `apps/` ni `packages/` |
| Versionado | `VERSION` = 1.7.23 vs `package.json` = 1.8.0 (desincronizado) |
| ADR-030 | **Aceptado** (2026-07-30) — Command & Actuation Protocol |
| RFC-0009 | DRAFT |
| DDD-008 | Borrador (device status policy) |
| EDD-006 | Nuevo — channel mapping canónico |
| Repo | Múltiples archivos sin commitear; ISSUE-030/ADR-030/RFC-0009/EDD-006 sin versionar |

---

## 3. Evidencia por componente

### 3.1 Backend — MQTT Bridge (`backend/src/services/mqttBridge.js`)

| Hallazgo | Evidencia |
|----------|-----------|
| Suscripciones a 6 topics con prefijo `mush2` QoS 1 | L49-54: `mush2/+/telemetry\|status\|alarm\|ack\|health\|maintenance` |
| Comando publicado con formato **anidado** | L154-164: `{cmdId, source, ts, command:{type:'ACTUATOR_SET', channel, value}, ...config}` |
| `ts` en **milisegundos** (`Date.now()`) | L157 — el wire usa Unix **segundos** (ADR-026) |
| ACK parseado **flat** (channel/cmdId/status en raíz) | L170-202 |
| Estado ACK: `true \|\| 1 → 'ON'` | L193 |
| Telemetría: 5 tipos de sensor persistidos + evento SSE | L227-233 (persiste), L246-255 (SSE `telemetry`) |
| Health espera `freeHeap` (no `heap`) | L273 |

### 3.2 Backend — Registro de comandos (`backend/src/routes/actuators.js`)

| Hallazgo | Evidencia |
|----------|-----------|
| `cmdId` generado como UUID v4 (`crypto.randomUUID()`) | L97 — consistente con ADR-030 §2 |

### 3.3 Backend — Tests MQTT

| Hallazgo | Evidencia |
|----------|-----------|
| Tests de contrato MQTT son **estáticos** (leen la fuente con `readFileSync`), no ejercitan broker | `__tests__/backward-compatibility.test.ts:15`, `mqtt-secure-connection.test.ts:15`, `mqtt-broker-unavailable.test.ts:24` |
| Un test estático espera formato de comando **distinto** al implementado | `backward-compatibility.test.ts:102` espera `type: 'actuator_state'`; `mqttBridge.js:159` publica `type: 'ACTUATOR_SET'` |

### 3.4 Backend — Capa de dominio MQTT

| Hallazgo | Evidencia |
|----------|-----------|
| `mqtt-adapter.ts` existe pero es **código muerto** (dead code) | Presente en `backend/src/services/mqtt-adapter.ts` (34 líneas); sin imports ni consumidores activos en `backend/src/` |
| No participa en el flujo productivo MQTT | El flujo vigente (telemetría, health, ACK) lo resuelve `mqttBridge.js`; `mqtt-adapter.ts` queda desacoplado |
| Referencias documentales que lo posicionan como arquitectura objetivo | `docs/architecture/backend.md:82` y `docs/roadmap/roadmap.md:244` |

### 3.5 Firmware — Payloads reales (`firmware/src/mqtt_client.cpp`)

| Mensaje | Formato real | Evidencia |
|---------|--------------|-----------|
| Telemetry | `{"temp":%.1f,"hum":%.1f,"co2":%u,"tvoc":%u,"aqi":%u,"ts":%lu}` — campo `co2` | L83-89 |
| Status | `{"state","mode","rssi","mac","fwVer","hwRev","ts"}` | L91-97 |
| Health | `freeHeap/minFreeHeap/maxAllocHeap/stack/{...}/i2cHealthy/sensorAht21/sensorEns160/...` | L106-138 |
| LWT (retain) | `{"state":"offline","ts":0}` QoS 1 | L163-167 |
| Online (retain) | `{"state":"online","mode","rssi","mac","fwVer","hwRev","ts"}` | L191-201 |
| QoS de publicaciones | **QoS 0** (overload por defecto de `_client.publish`) | L76-81 |

### 3.6 Firmware — Parser de comandos (`firmware/src/mqtt_client.cpp`)

| Hallazgo | Evidencia |
|----------|-----------|
| Exige array `actuators` en la raíz; si falta, **descarta el mensaje** | L260-264 |
| Lee `channel`, `state` (string `"ON"`), `mode` (string `"REMOTE"`), `status`, `phase`, `setpoints` | L270-293 |
| No existe código de publicación de ACK en firmware | — |
| Suscripciones: `ota/command` y `actuators` (QoS por defecto 0) | L176-181 |

### 3.7 Firmware — Channel mapping (`firmware/src/tasks.cpp`)

| Hallazgo | Evidencia |
|----------|-----------|
| Remapeo de canales de histéresis → SSR | L281-286: `CH1=Ventilación, CH2=Calefacción, CH3=Humidificación, CH4=Iluminación` |
| Precedencia REMOTE (`actuatorMode[ch]==1`) aplicada sobre outputs | L288-292 |

### 3.8 Frontend

| Hallazgo | Evidencia |
|----------|-----------|
| Consumo de eventos en tiempo real vía SSE | `frontend/src/api/useSSE.js` |
| Estado local por página, sin Redux/Zustand | — |
| DDD-008 mayormente pagado: `deviceStatus.js` como fuente única | `frontend/src/shared/constants/deviceStatus.js` |

### 3.9 Infraestructura y seguridad

| Hallazgo | Evidencia |
|----------|-----------|
| `POST /api/v1/devices/register` **no autenticado** | — |
| Provisioning reinicia el contenedor Mosquitto | — |
| ACL Mosquitto DEV ya permiten `write mush2/%c/ack` | `docker/mosquitto/dev/acl.conf` |
| CI: 3 jobs, **sin broker ni e2e** | `.github/workflows/ci.yml` |

---

## 4. Hallazgos

### H-01 — MQTT Contract Drift (topics)

| Fuente | Estructura de topics |
|--------|----------------------|
| `docs/contracts/mqtt-contract.md` (vigente) | `mush2/{deviceId}/{accion}` |
| `docs/protocol/protocol-v1.md` (obsoleto, no deprecado) | `mush2/{tipo}/{deviceId}/{accion}` |
| Legado | `nodo/...` |

**Riesgo:** cualquier cliente nuevo (p. ej. el simulador) puede tomar como referencia un documento obsoleto y perpetuar el drift.

### H-02 — Comando backend → firmware roto en formato

| Formato | Origen |
|---------|--------|
| `{cmdId, source, ts(ms), command:{type:'ACTUATOR_SET', channel, value}}` | `mqttBridge.js:154-164` (publicado) |
| `{actuators:[{channel, state, mode}], status, phase, setpoints}` | `mqtt_client.cpp:260-293` (esperado por firmware) |
| `{cmdId, channel, state, source, ts}` (flat) | ADR-030 §"Formato canónico" |

**Consecuencia:** el parser del firmware exige `actuators[]`; al no existir, **descarta el comando**. Un dispositivo real no ejecuta comandos del backend actual. Además `ts` en ms viola ADR-026.

### H-03 — ACK sin implementar

- El firmware **no publica ACK**.
- El backend espera ACK flat en `mush2/{deviceId}/ack` (`mqttBridge.js:170-202`) y, además, parsea `status` cuando llega con `cmdId||channel` (`mqttBridge.js:95-97`).
- ADR-030 define ACK canónico `{cmdId, channel, state, status, ts}`.
- El frontend espera evento SSE `ack` con `actuatorState` y `status: ACKED|TIMEOUT`.

### H-04 — QoS documentada ≠ QoS real

- `mqtt-contract.md §3.1` declara QoS 1 para telemetría/estado/health publicados por firmware.
- El firmware publica con **QoS 0** (`mqtt_client.cpp:76-81`). Solo LWT usa QoS 1.

### H-05 — Payloads divergentes en la guía de desarrollo (`DEV_ENVIRONMENT.md`)

| Línea | Guía escribe | Firmware/Backend usan |
|-------|--------------|------------------------|
| L427 | `eco2` | `co2` (`mqtt_client.cpp:86`, `mqttBridge.js:230`) |
| L432 | `heap` | `freeHeap` (`mqttBridge.js:273`) |
| L442 | comando con `type:"actuator_state"`, `state:1` numérico | parser espera `actuators[]` y `state:"ON"` string |

**Consecuencia:** quien use la guía para validar la vertical slice publicará payloads que el backend/firmware no interpretan.

### H-06 — Pruebas de contrato estáticas

Los tests de contrato MQTT inspeccionan el texto fuente en vez de ejercitar el broker, y al menos uno espera un formato (`actuator_state`) que la implementación actual no produce (`ACTUATOR_SET`). No detectan regresiones de integración reales.

### H-07 — Implementación MQTT no utilizada (dead code)

- `backend/src/services/mqtt-adapter.ts` **sí existe** (34 líneas), pero **no participa en el flujo productivo**: no tiene importadores activos en `backend/src/` y el flujo MQTT vigente (telemetría/health/ACK) lo resuelve `mqttBridge.js`.
- Aparece en `docs/architecture/backend.md:82` y `docs/roadmap/roadmap.md:244` como capa de dominio de la arquitectura objetivo, lo que la posiciona como abstracción alternativa del mismo contrato.

**Impacto arquitectónico:**
- Posible duplicidad de responsabilidades: dos abstracciones MQTT coexisten para el mismo dominio (la viva, `mqttBridge.js`; la no utilizada, `mqtt-adapter.ts`).
- Riesgo de divergencia futura: cualquier consumidor nuevo del broker puede tomar como referencia una de las dos abstracciones y perpetuar el drift (intención original del hallazgo).
- Deuda técnica trazable: consolidar o eliminar la implementación no utilizada cuando la migración lo permita. **No se elimina en este cambio; no se modifica `mqttBridge.js`.**

### H-08 — Gobernanza documental desincronizada

- `VERSION` (1.7.23) ≠ `package.json` (1.8.0).
- `docs/roadmap/roadmap.md` referencia `protocol-v2.md` inexistente.
- RFC-0009 en DRAFT mientras ADR-030 (que lo cita como especificación adoptada) está Aceptado.
- DDD-008 en Borrador mientras ADR-025 lo respalda.

---

## 5. Fortalezas

- ADR-030 **Aceptado** resuelve formalmente la disputa de `cmdId` (UUID v4) y define un formato canónico flat.
- Backend centraliza el pipeline de eventos (ADR-026) y suscribe con QoS 1.
- Firmware usa LWT + retain `online/offline` correctamente.
- DDD-008 mayormente materializado en frontend (`deviceStatus.js` como fuente única).
- ACL DEV ya contemplan `write .../ack` para el futuro ACK.
- Gobernanza explícita (RECTOR-ISSUE → ISSUE → DDD → ADR → EDD/RFC) permite trazabilidad.
- El ecosistema ya reconoce el objetivo de `packages/protocol` como contenedor del contrato compartido (`simulation-platform-roadmap.md`).

---

## 6. Debilidades y riesgos

| Área | Debilidad | Riesgo |
|------|-----------|--------|
| Validación | Sin broker en CI, tests MQTT estáticos, vertical slice manual | Regresiones de integración silenciosas |
| Contrato | 3 estructuras de topics; 3 formatos de comando | Nuevo consumidor perpetúa el drift |
| Comando | Formato publicado no parseable por firmware; ACK ausente | Vertical slice comando→ACK no verificable |
| Documentación | `protocol-v1.md` sin deprecar; `DEV_ENVIRONMENT.md` con payloads erróneos | Guías heredan el error |
| Seguridad | `POST /register` sin autenticación; provisioning reinicia broker | Abuso del registro en ambientes compartidos |
| Versionado | `VERSION` y `package.json` desincronizados | Trazabilidad de release confusa |
| Deuda técnica | `mqtt-adapter.ts` existe sin consumidores; dos abstracciones MQTT coexisten (H-07) | Duplicidad de responsabilidades y drift futuro |

---

## 7. Conflictos arquitectónicos

1. **Contract drift (H-01):** el topic path canónico no está unificado entre `mqtt-contract.md`, `protocol-v1.md` y el legado.
2. **Duplicidad de formato de comando (H-02):** backend, firmware y ADR-030 definen tres shapes distintos para el mismo mensaje.
3. **Acoplamiento ACK (H-03):** el backend asume un ACK que el firmware no emite, con dos shapes posibles (flat y array).
4. **Regresión silenciosa (H-06):** los tests de contrato leen el fuente y no pueden detectar cambios de comportamiento.
5. **Dependencias ocultas:** la validación manual documentada depende de payloads que el sistema no interpreta (H-05).
6. **Implementación no utilizada (H-07):** `mqtt-adapter.ts` coexiste como abstracción MQTT sin uso mientras `mqttBridge.js` gobierna el flujo; riesgo de duplicidad y divergencia futura.

---

## 8. Alternativas de diseño (síntesis comparativa)

| Alternativa | Ventajas | Desventajas | Complejidad | Mantenibilidad |
|-------------|----------|-------------|-------------|----------------|
| **A — App standalone con tipos duplicados** | Aislamiento total, rápido | Perpetúa el contract drift | Baja | Baja |
| **B — App + Shared Protocol Package** (`packages/protocol`) | Single Source of Truth; elimina drift | Requiere decisión de workspace y refactor de imports | Media | Alta |
| **C — Módulo interno del backend** | Reutiliza modelos | Acopla simulación al backend; dificulta uso independiente | Baja | Media |
| **D — Port del firmware a Node** | Fidelidad de comportamiento | Duplica lógica; mantenimiento doble | Alta | Baja |
| **E — Plataforma completa desde inicio** | Cobertura total | Scope creep; viola Incremental Fidelity | Muy alta | Media |

---

## 9. Conveniencia de componentes (síntesis)

| Componente | Conveniencia |
|------------|--------------|
| **Virtual Device** | Sí — núcleo de la plataforma |
| **Shared Protocol Package** | Sí como FASE 0 — condicionado a resolver H-02/H-03 |
| **Device Registry Virtual** | Parcial — FASE 5+ |
| **Scenario Engine / Farm Engine / HAL** | No en MVP |
| **Simulation Clock / Virtual Time** | No en MVP — conflicto con ADR-026 (`lastSeen` es reloj del servidor) |
| **Digital Twin** | Visión futura |

---

## 10. Impacto documental

**Crear:**
- RFC — Simulation Platform
- ADR — Simulator Architecture
- EDD — Virtual Device Model
- EDD — Scenario Model
- Artefactos de conformance (schemas, ejemplos canónicos, validadores, contract tests)

**Actualizar (en fases):**
- `docs/contracts/mqtt-contract.md` §1 (Simulator como cliente oficial)
- `DEV_ENVIRONMENT.md` (payloads canónicos)
- `docs/roadmap/roadmap.md` (resolver referencia a `protocol-v2.md`)
- `pnpm-workspace.yaml`, `.github/workflows/ci.yml` (FASE 7)
- `docs/ADR/README.md`, `docs/RFC/README.md`, `docs/EDD/README.md` (índices)

---

## 11. Referencias verificadas

- `backend/src/services/mqttBridge.js` (L49-54, L95-97, L148-168, L170-202, L218-259, L261-301)
- `backend/src/services/mqtt-adapter.ts` (dead code; sin importadores activos)
- `backend/src/routes/actuators.js` (L97)
- `backend/src/__tests__/backward-compatibility.test.ts` (L15, L102)
- `backend/src/__tests__/mqtt-secure-connection.test.ts` (L15)
- `backend/src/__tests__/mqtt-broker-unavailable.test.ts` (L24)
- `firmware/src/mqtt_client.cpp` (L76-81, L83-89, L91-97, L106-138, L163-167, L176-181, L191-201, L260-293)
- `firmware/src/tasks.cpp` (L281-292)
- `docs/contracts/mqtt-contract.md` (§3.1, §6, §7.1)
- `docs/ADR/ADR-030-command-actuation-protocol.md` (§2 cmdId, §Formato canónico)
- `docs/architecture/backend.md` (L82), `docs/roadmap/roadmap.md` (L244)
- `DEV_ENVIRONMENT.md` (L424-443)
- `VERSION`, `package.json`, `.github/workflows/ci.yml`, `pnpm-workspace.yaml`
