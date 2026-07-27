# ADR-026: Temporal Contract

**Estado:** Propuesto

**Fecha:** 2026-07-26

**Autores:** Equipo Mush2

**Decisores:** Equipo Mush2

---

# Resumen

Se establece el Contrato Temporal oficial de Mush2: una política transversal que define la representación, autoridad, semántica y flujo de todos los datos temporales utilizados por Firmware, MQTT, Backend, Base de Datos, API y Frontend. Elimina definitivamente las ambigüedades entre Unix Seconds, Unix Milliseconds, objetos Date, TIMESTAMPTZ e ISO-8601, y establece una única autoridad de conversión centralizada.

---

# Regla de ingeniería

> **Todo timestamp debe tener una autoridad claramente definida. Ningún componente puede reinterpretar o sobrescribir un timestamp cuya autoridad pertenece a otra capa.**

---

# Contexto

## Situación actual

El sistema maneja timestamps de forma inconsistente entre capas:

- **Firmware**: Transmite `ts` como Unix Epoch Seconds (UTC)
- **Backend**: Algunos handlers interpretan `ts` como Unix Milliseconds (`new Date(1785046536)` en lugar de `new Date(1785046536 * 1000)`), produciendo fechas en 1970
- **Backend**: Algunos handlers usan `Date.now()` (milliseconds) para timestamps de recepción
- **API**: Expone fechas como ISO-8601 UTC (correcto), pero algunos campos expone `Date.now()` como enteros
- **Frontend**: Recibe ISO strings y las interpreta correctamente, pero algunos hooks duplicados procesan eventos de forma inconsistente

## Problema

No existe un Contrato Temporal que defina:

- Qué representa cada timestamp (evento, recepción, persistencia, presentación)
- Quién es la autoridad de cada timestamp
- En qué formato viaja cada timestamp
- Dónde se produce la conversión entre formatos
- La distinción entre comunicación entrante (evidencia de vida) y saliente (comandos)

## Consecuencias de no actuar

- `lastCommandAt` y `lastAckAt` permanecen permanentemente `null` porque `recordEvent()` nunca se invoca con esos tipos
- La conectividad puede calcularse con timestamps corruptos
- Nuevos tipos de eventos (OTA, Calibration) requieren que el desarrollador recuerde agregar llamadas a `recordEvent()`, sin garantía de que lo haga
- No hay distinción entre comunicación entrante (dispositivo demuestra que está vivo) y saliente (backend envía comando)

---

# Decisión

## 1. Temporal Vocabulary — Clasificación de timestamps

Se definen cuatro categorías formales:

| Categoría | Qué representa | Quién lo genera | Autoridad del reloj |
|-----------|----------------|-----------------|---------------------|
| **Event Timestamp** | Instante en que ocurrió el evento según el emisor | Firmware | Firmware (RTC/SNTP) |
| **Reception Timestamp** | Instante en que el backend recibió evidencia válida | Backend | Backend (servidor) |
| **Persistence Timestamp** | Instante en que el registro fue persistido | DB/ORM | PostgreSQL / Sequelize |
| **Presentation Timestamp** | Cómo se muestra al usuario | Frontend | Navegador (solo visual) |

## 2. Autoridad del reloj por timestamp

| Timestamp | Categoría | Autoridad | Formato original | Dónde se convierte | Dónde se almacena | Cómo se expone | Cómo se visualiza |
|-----------|-----------|-----------|-------------------|--------------------|--------------------|----------------|-------------------|
| `Telemetry.timestamp` | Event | Firmware | Unix seconds | `mqttBridge.js` (única conversión) | `TIMESTAMPTZ` | ISO-8601 UTC | `toLocaleString()` |
| `DeviceHealth.timestamp` | Event | Firmware | Unix seconds | `mqttBridge.js` | `TIMESTAMPTZ` | ISO-8601 UTC | `toLocaleString()` |
| `DeviceMaintenance.timestamp` | Event | Firmware | Unix seconds | `mqttBridge.js` | `TIMESTAMPTZ` | ISO-8601 UTC | `toLocaleString()` |
| `Device.lastSeen` | Reception | Backend | `new Date()` | Nunca (ya es Date) | `TIMESTAMPTZ` | ISO-8601 UTC | `toLocaleString()` |
| `Device.lastTelemetryAt` | Reception | Backend | `new Date()` | Nunca | `TIMESTAMPTZ` | ISO-8601 UTC | Relativo ("hace Xm") |
| `Device.lastCommandAt` | Reception (saliente) | Backend | `new Date()` | Nunca | `TIMESTAMPTZ` | ISO-8601 UTC | Relativo |
| `Device.lastAckAt` | Reception | Backend | `new Date()` | Nunca | `TIMESTAMPTZ` | ISO-8601 UTC | Relativo |
| `Device.createdAt` | Persistence | PostgreSQL | `NOW()` | Sequelize auto | `TIMESTAMPTZ` | ISO-8601 UTC | `toLocaleString()` |
| `Device.updatedAt` | Persistence | PostgreSQL | `NOW()` | Sequelize auto | `TIMESTAMPTZ` | ISO-8601 UTC | `toLocaleString()` |
| UI display | Presentation | Navegador | `Date` object | Frontend (nunca modifica el dato) | N/A | Visual solamente | `toLocaleString()` |

## 3. Representación por capa

| Capa | Formato permitido | Formato prohibido |
|------|-------------------|-------------------|
| **Firmware** | Unix Epoch Seconds (UTC) | ISO-8601, Unix Milliseconds |
| **MQTT** | Passthrough del firmware | Cualquier conversión |
| **Backend** | Date object (única autoridad de conversión entre protocolos externos y representación interna del dominio) | Enteros temporales después de la conversión inicial |
| **Base de Datos** | `TIMESTAMP WITH TIME ZONE` | `BIGINT` para fechas |
| **API** | ISO-8601 UTC | Unix seconds, Unix milliseconds |
| **Frontend** | ISO-8601 (recibido) → visual solamente | Interpretar Unix seconds |

## 4. Punto único de conversión

```
Firmware (seconds) → MQTT (passthrough) → Backend (Date object) → DB (TIMESTAMPTZ) → API (ISO-8601) → Frontend (visual)
         ↑                                    ↑
    Único punto donde                    Nunca más se
    seconds → Date                       trabaja con enteros
```

Ubicación: `mqttBridge.js` — cada handler (`handleTelemetry`, `handleHealth`, `handleMaintenance`) aplica la conversión:

```js
const ts = rawTs < 1e12 ? rawTs * 1000 : rawTs;
const eventTime = new Date(ts);
```

## 5. Clasificación de eventos de comunicación

### 5.1 Comunicación entrante (Incoming)

Toda comunicación que proviene del dispositivo constituye evidencia de vida. Actualiza `lastSeen` porque el dispositivo ha demostrado que está operativo.

| Evento | Event Timestamp | Reception Timestamp | Actualiza `lastSeen` | Actualiza sub-campo |
|--------|-----------------|---------------------|----------------------|---------------------|
| Telemetry | ✔ (firmware `ts`) | ✔ (`new Date()`) | ✔ | `lastTelemetryAt` |
| Health | ✔ (firmware `ts`) | ✔ (`new Date()`) | ✔ | — |
| Maintenance | ✔ (firmware `ts`) | ✔ (`new Date()`) | ✔ | — |
| Alarm | ✔ (firmware `ts`) | ✔ (`new Date()`) | ✔ | — |
| Ack | ✔ (firmware `ts`) | ✔ (`new Date()`) | ✔ | `lastAckAt` |
| Status | ✔ (firmware `ts`) | ✔ (`new Date()`) | ✔ | — |

### 5.2 Comunicación saliente (Outgoing)

Los comandos enviados hacia el dispositivo registran actividad pero **no constituyen evidencia de vida**. El dispositivo aún no ha demostrado que está operativo.

| Evento | Event Timestamp | Reception Timestamp | Actualiza `lastSeen` | Actualiza sub-campo |
|--------|-----------------|---------------------|----------------------|---------------------|
| Command | ✖ (no aplica) | ✔ (`new Date()`) | **No** | `lastCommandAt` |

**Justificación:** Enviar un comando no garantiza que el dispositivo esté vivo. Solo cuando el dispositivo responde con un ACK se confirma la recepción. La conectividad debe cambiar únicamente cuando exista respuesta desde el dispositivo.

## 6. Política `lastSeen`

> `lastSeen` representa el instante en que el backend recibió la última evidencia válida de vida del dispositivo. **Siempre** se genera con `new Date()` del reloj del servidor. **Nunca** se deriva de `data.ts` del firmware.

## 7. Responsabilidades por capa

### Firmware

- Transmite `ts` como Unix Epoch Seconds (UTC)
- Nunca envía ISO-8601 ni Unix Milliseconds
- No depende del backend para obtener la hora (usa SNTP)

### MQTT

- Transporta exactamente el mismo formato enviado por el firmware
- No realiza conversiones
- Actúa como pipe de bytes

### Backend

- Convierte una única vez: Unix Seconds → Date object (en `mqttBridge.js`)
- Después de la conversión, nunca vuelve a trabajar con enteros temporales
- Centraliza la actualización de timestamps de recepción mediante `recordEvent()` (incoming) y `recordOutgoing()` (outgoing)
- Es la única autoridad de conversión entre protocolos externos y representación interna del dominio

### Base de Datos

- Todos los campos temporales utilizan `TIMESTAMP WITH TIME ZONE`
- Nunca `BIGINT` para representar fechas
- `createdAt` y `updatedAt` son gestionados automáticamente por Sequelize

### API

- Toda fecha expuesta utiliza ISO-8601 UTC
- Nunca expone Unix seconds o Unix milliseconds

### Frontend

- Nunca interpreta Unix seconds
- Siempre recibe fechas ISO
- Toda localización es únicamente visual
- Nunca modifica el dato almacenado

---

# Justificación

- **Elimina ambigüedades**: Cada timestamp tiene una representación, autoridad y flujo documentados
- **Previene bugs futuros**: El funnel centralizado garantiza que nuevos tipos de eventos actualicen `lastSeen` sin intervención manual
- **Distingue incoming/outgoing**: La conectividad solo cambia con evidencia de vida real, no con comandos salientes
- **Escalable**: Cuando se agreguen `OTA_PROGRESS`, `CALIBRATION` o `DIAGNOSTICS`, automáticamente actualizarán `lastSeen` sin modificar código existente

---

# Alternativas consideradas

## Alternativa A: Agregar llamadas puntuales a `recordEvent()` en cada handler

### Ventajas

- Cambio mínimo
- No requiere refactorización

### Desventajas

- Deja abierta la posibilidad de olvidar llamadas en futuros eventos
- No distingue incoming/outgoing
- Acumula deuda técnica

### Motivo del descarte

- Exactamente el tipo de deuda técnica que se intenta eliminar

---

## Alternativa B: Funnel centralizado con distinción incoming/outgoing

### Ventajas

- Garantiza que todo evento MQTT actualice `lastSeen`
- Nuevos eventos automáticamente actualizan `lastSeen`
- Distingue comunicación entrante (evidencia de vida) de saliente (comandos)

### Desventajas

- Requiere refactorización de `recordEvent` en dos funciones
- Cambia el contrato de la API interna

### Motivo de selección

- Alineado con la filosofía del proyecto de eliminar ambigüedades

---

# Consecuencias

## Positivas

- `lastSeen` se actualiza con todo tipo de comunicación entrante
- `lastCommandAt` y `lastAckAt` se poblarán correctamente
- Nuevos tipos de eventos no requieren modificar el funnel
- La conectividad refleja exclusivamente evidencia de vida real

## Negativas

- Requiere refactorización de `recordEvent` en `recordIncoming` / `recordOutgoing`
- Se eliminan llamadas duplicadas en handlers existentes

## Riesgos

- Si el funnel centralizado falla, todos los timestamps dejan de actualizarse (mitigado con `.catch(() => {})`)

---

# Impacto en la arquitectura

| Componente | Impacto |
|------------|---------|
| Firmware | Ninguno — no se modifica el protocolo MQTT |
| MQTT Bridge | Alto — funnel centralizado, refactorización de recordEvent |
| Backend Services | Medio — controlEngine, api.js, actuators.js, thingSpeakSync.js |
| Base de Datos | Ninguno — esquema sin cambios |
| API | Bajo — `analytics.js` corrige formato de `ts` |
| Frontend | Medio — SSE lastSeenAt, unificación useSSE |

---

# Reglas derivadas

| ID | Regla |
|----|--------|
| ADR-026-01 | Todo timestamp debe tener una autoridad claramente definida |
| ADR-026-02 | Ningún componente puede reinterpretar o sobrescribir un timestamp cuya autoridad pertenece a otra capa |
| ADR-026-03 | `lastSeen` solo se actualiza con comunicación entrante del dispositivo |
| ADR-026-04 | Comandos salientes actualizan `lastCommandAt` pero nunca `lastSeen` |
| ADR-026-05 | La conversión Unix Seconds → Date object ocurre exclusivamente en `mqttBridge.js` |
| ADR-026-06 | Después de la conversión inicial, el backend nunca vuelve a trabajar con enteros temporales |
| ADR-026-07 | Toda fecha expuesta por la API utiliza ISO-8601 UTC |
| ADR-026-08 | El frontend nunca interpreta Unix seconds, solo recibe ISO strings |
| ADR-026-09 | Todo evento MQTT entrante actualiza `lastSeen` mediante el funnel centralizado |
| ADR-026-10 | La conectividad del dispositivo cambia únicamente cuando el dispositivo demuestra que está vivo |

---

# Implementación

## Communication Event Pipeline

El flujo de eventos de comunicación se centraliza en un pipeline:

```
MQTT Message Arrives
       │
       ▼
Communication Event Pipeline (mqttBridge.js)
       │
       ├── [Incoming] → recordIncoming(deviceId, eventType)
       │                    ├── lastSeen = now
       │                    ├── lastTelemetryAt (si eventType = 'telemetry')
       │                    ├── lastAckAt (si eventType = 'ack')
       │                    └── detectar transición de estado
       │
       ├── [Outgoing] → recordOutgoing(deviceId, eventType)
       │                    ├── lastCommandAt = now
       │                    └── detectar transición de estado
       │
       └── Despachar al handler específico
```

### Clasificación de Incoming vs Outgoing

| Topic MQTT | Dirección | Función |
|------------|-----------|---------|
| `mush2/+/telemetry` | Incoming | `recordIncoming` |
| `mush2/+/health` | Incoming | `recordIncoming` |
| `mush2/+/maintenance` | Incoming | `recordIncoming` |
| `mush2/+/alarm` | Incoming | `recordIncoming` |
| `mush2/+/ack` | Incoming | `recordIncoming` |
| `mush2/+/status` | Incoming | `recordIncoming` |
| REST actuator command | Outgoing | `recordOutgoing` |
| Control engine auto command | Outgoing | `recordOutgoing` |

---

# Validación

- Verificar que `lastSeen` se actualiza con cada tipo de evento MQTT entrante
- Verificar que `lastCommandAt` se actualiza con comandos REST y del control engine
- Verificar que `lastAckAt` se actualiza con ACK del dispositivo
- Verificar que comandos salientes NO actualizan `lastSeen`
- Verificar que `secondsSinceLastSeen` refleja correctamente la conectividad
- Ejecutar tests: `npm run test`
- Verificar build del frontend: `npm run build`

---

# ADR relacionados

- ADR-025 (Device Status Policy) — Connectivity se calcula a partir de `lastSeen`
- DDD-008 (Device Status Policy) — Modelo multidimensional que depende de este contrato

---

# Referencias

- ISO 8601 — Formato de intercambio de fechas
- Unix Epoch — Seconds vs Milliseconds
- PostgreSQL `TIMESTAMP WITH TIME ZONE`
- Sequelize `DataTypes.DATE`

---

# Historial

| Versión | Fecha | Cambio |
|----------|---------|--------|
| 1.0 | 2026-07-26 | Creación |
