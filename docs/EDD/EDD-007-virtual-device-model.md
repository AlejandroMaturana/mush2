# EDD-007 — Virtual Device Model

## Metadata

| Campo | Valor |
|-------|-------|
| Autor | Equipo Mush2 |
| Estado | DRAFT |
| Fecha | 2026-07-30 |
| ADRs rel. | ADR-026, ADR-028, ADR-030, ADR-031 |
| RFC rel. | RFC-0009, RFC-0010 |
| EDD rel. | EDD-006 |

## 1. Problema / Contexto

Mush2 requiere validar su ecosistema sin hardware físico. Se necesita una entidad **Virtual Device** que, desde el punto de vista del backend, sea indistinguible de un ESP32 real: habla el contrato MQTT, se registra y autentica como un dispositivo, publica telemetría/estado/health y responde a comandos.

## 2. Objetivos

- Replicar la superficie de mensajes del firmware conforme al contrato congelado.
- Ser registrable mediante el flujo estándar de identidad de dispositivo (ADR-028).
- Mantener conexión MQTT estable con reconnect y LWT.
- Recibir comandos y emitir ACK conforme al contrato (ADR-030).
- Publicar mensajes que pasen los validadores de conformance.
- Ser determinista, configurable y observable.

## 3. No-objetivos

- Replicar lógica de negocio del backend (setpoints, control, recetas).
- Modelar física del ambiente (FASE 3).
- Múltiples dispositivos (FASE 5).
- Tiempo virtual (FASE 6).
- Compartir drivers o implementación con el firmware.

## 4. Alternativas consideradas

| Alternativa | Decisión |
|-------------|----------|
| Duplicar tipos en la app | Descartada — perpetúa el drift |
| Reusar módulos internos del backend | Descartada — acopla simulación al backend |
| Paquete de protocolo compartido (`packages/protocol`) | **Adoptada** (RFC-0010, ADR-031) |

## 5. Solución propuesta

### 5.1 Responsabilidades

```
Virtual Device
 ├── MQTT Transport        — conexión, auth, reconnect, QoS
 ├── Protocol             — serialización/deserialización conforme al contrato
 ├── Behavior             — ciclos de publicación, respuesta a comandos
 ├── State                — estado interno (FASE 2, EDD-009)
 └── Configuration        — config externa (DEVICE_ID, MQTT_URL, credenciales, intervalos)
```

### 5.2 Superficie de mensajes (FASE 1)

| Dirección | Topic | Mensaje | Schema conformance |
|-----------|-------|---------|---------------------|
| Device → Broker | `mush2/{deviceId}/status` | online/offline/FSM + retain | `status.schema.json` |
| Device → Broker | `mush2/{deviceId}/telemetry` | temp/hum/co2/tvoc/aqi | `telemetry.schema.json` |
| Device → Broker | `mush2/{deviceId}/health` | heap/stacks/sensores | `health.schema.json` |
| Device → Broker | `mush2/{deviceId}/alarm` | reason | `alarm.schema.json` |
| Device → Broker | `mush2/{deviceId}/maintenance` | component/health | `maintenance.schema.json` |
| Device → Broker | `mush2/{deviceId}/ack` | cmdId/status/actuatorState | `ack.schema.json` |
| Broker → Device | `mush2/{deviceId}/actuators` | comando canónico | `command.schema.json` |

### 5.3 Configuración externa

| Variable | Propósito |
|----------|-----------|
| `DEVICE_ID` | Identificador del dispositivo virtual |
| `MQTT_URL`, `MQTT_PORT` | Broker |
| `USERNAME`, `PASSWORD` | Credenciales provisionadas (ADR-028) |
| `TELEMETRY_INTERVAL` | Período de publicación (default 10s) |
| `STATUS_INTERVAL` | Período de status (default 60s) |
| `HEALTH_INTERVAL` | Período de health |
| `ALARM_ENABLED` | Habilitar alarmas simuladas |
| `SEED` | Semilla de determinismo |

### 5.4 Ciclos de comportamiento

- Al conectar: publicar `status` online **retained** y suscribirse a `actuators` (y `ota/command` en fases posteriores).
- Publicar telemetría y status periódicamente.
- Al recibir comando: validar contra schema → actualizar estado interno (FASE 2) → emitir ACK canónico.
- Al desconectar: LWT `{"state":"offline","ts":...}` retained.

### 5.5 Restricción de diseño: contract-first

El diseño implementa exclusivamente los contratos congelados; ninguna divergencia del código existente se promueve a variante válida del protocolo:

| Fuente | Rol |
|--------|-----|
| `RFC-0009-command-actuation-protocol.md` | Command Protocol — formato canónico del comando |
| `docs/ADR/ADR-030-command-actuation-protocol.md` | Decisión arquitectónica — `cmdId`, formato flat |
| `docs/EDD/EDD-006-mapeo-canales-actuadores.md` | Mapeo canónico de canales de actuadores |
| `docs/contracts/conformance/` | Schemas, ejemplos canónicos y contract tests |

Toda divergencia observada en el código existente se trata como **legacy drift**: se registra, se mantiene la ruta legacy (ver §5.10) y se implementa el contrato.

### 5.6 Arquitectura vertical slice (FASE 1)

El diseño debe permitir validar el flujo completo extremo a extremo:

```
Control Engine            backend  services/controlEngine.js
      ↓
Command Builder           backend  domain/commands/commandBuilder.js
      ↓
MQTT Transport            backend  services/mqttBridge.js → topic actuators
      ↓
Firmware Command Handler  Virtual Device (rol firmware en FASE 1)
      ↓
Actuator Execution        Virtual Device
      ↓
ACK Generation            Virtual Device → topic ack
      ↓
Backend State Update      backend  handler de ACK + registro de estado
      ↓
API Verification          backend  API / frontend (SSE)
```

| Paso | Componente | Entrega verificable |
|------|-----------|---------------------|
| Control Engine | backend `services/controlEngine.js` | decisión de actuación |
| Command Builder | backend `domain/commands/` | payload canónico + `cmdId` |
| MQTT Transport | backend `services/mqttBridge.js` | publish al topic canónico |
| Firmware Command Handler | Virtual Device | parse conforme al schema |
| Actuator Execution | Virtual Device | estado del actuador |
| ACK Generation | Virtual Device | ack canónico al topic |
| Backend State Update | backend | registro de ACK + estado |
| API Verification | backend + frontend | estado observable |

En FASE 1 la pata "firmware" del slice la ejecuta el **Virtual Device**; el firmware real valida su conformidad contra los mismos contract tests en una fase posterior.

### 5.7 Command Domain Layer (backend)

El contrato ADR-030 se materializa en una capa explícita del backend, desacoplada del control engine:

```
backend/src/domain/commands/
 ├── commandBuilder.js
 ├── commandSchema.js
 └── commandLifecycle.js
```

**`commandBuilder.js`:**
- creación del comando canónico (formato flat ADR-030)
- generación de `cmdId` (UUID v4, según ADR-030)
- incorporación de `source` y `ts`
- normalización del payload (canales según EDD-006)

**`commandSchema.js`:**
- validación estructural del comando
- cumplimiento del contrato (RFC-0009) contra los schemas de conformance
- rechazo de todo payload no canónico (drift → error explícito)

**`commandLifecycle.js`:**
- gestión de estados del comando (§5.8)
- reglas de transición
- trazabilidad operacional (persistencia por transición)

### 5.8 Ciclo de vida del comando

```
CREATED → PUBLISHED → DELIVERED → EXECUTED → CONFIRMED
```

| Transición | Generada por | Componente responsable | Información a persistir |
|-----------|--------------|------------------------|--------------------------|
| CREATED | builder valida y emite `cmdId` | backend `domain/commands/commandBuilder.js` | `cmdId`, payload canónico, `source`, `ts` |
| PUBLISHED | publish MQTT al topic `actuators` | backend `services/mqttBridge.js` | topic, QoS, `ts_publish` |
| DELIVERED | el dispositivo recibe y publica ack `DELIVERED` | Virtual Device → backend handler de ack | status ack, `ts`, rtt |
| EXECUTED | el actuador ejecuta y publica ack `COMPLETED` | Virtual Device → backend handler de ack | `actuatorState` resultante |
| CONFIRMED | el backend registra el ack, actualiza estado y lo expone | backend `domain/commands/commandLifecycle.js` | estado final observable |

Los estados internos del lifecycle se alimentan de los `status` del wire (`ack.schema.json`). **Fallo o expiración:** ventana de espera configurable; si no llega ack → `TIMEOUT`; si el dispositivo reporta error → `FAILED` / `EXPIRED`. El ciclo converge a un estado terminal de error con motivo, conservando la traza completa.

### 5.9 Diseño orientado a contract tests

Requisito arquitectónico (no estrategia de pruebas):

- Todo contrato externo (wire MQTT) es verificable mediante los schemas y contract tests de `docs/contracts/conformance/`.
- La implementación evita divergencias silenciosas entre componentes: todo mensaje que no pase el schema se rechaza o se registra como error explícito (fail-fast); nunca se publica a ciegas.

### 5.10 Compatibilidad durante migración

```
legacy actuator mapping
   ↓  deprecated
canonical actuator mapping
   ↓
ADR-030
```

- La ruta legacy se mantiene funcional y marcada como `deprecated` durante FASE 1.
- La ruta canónica (ADR-030) se valida contra el contrato antes de retirar la legacy.
- No se elimina código legacy hasta demostrar estabilidad del flujo canónico (criterio de salida de FASE 1).
- Ambas rutas conviven sin mappings contradictorios.

## 6. Impacto en componentes

| Componente | Impacto |
|------------|---------|
| Backend | Nuevo Command Domain Layer (`domain/commands/`) en la ruta canónica; handler de ACK con registro de estado y exposición por API. La ruta legacy permanece operativa (deprecated). El simulador en sí no exige cambios de backend (non-invasive) |
| Firmware | Ninguno en FASE 1; la pata firmware del slice la ejecuta el Virtual Device |
| Broker | ACLs DEV ya permiten `write mush2/%c/ack` |
| Docs | Contrato congelado en `docs/contracts/conformance/` |

## 7. Plan de implementación

1. FASE 0.5: congelar schemas y ejemplos canónicos (completada).
2. FASE 1: Command Domain Layer en backend (`commandBuilder`/`commandSchema`/`commandLifecycle`) + Virtual Device mínimo (conexión, telemetría, status, comandos, ACK) + handler de ACK + exposición por API.
3. FASE 2: estado interno (EDD-009) y mutación por comandos.

## 8. Métricas de éxito

- El backend opera con el Virtual Device como si fuera un ESP32 (vertical slice sin hardware).
- 100% de los mensajes del Virtual Device pasan los validadores de conformance.
- Reconexión y LWT verificables en el broker.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| El simulador replica lógica del backend | No-objetivos + revisión por fase |
| Mensajes no conformes | Validadores obligatorios antes de publicar |
| Determinismo roto | `SEED` y políticas deterministas |

## 10. Referencias

- `RFC-0009-command-actuation-protocol.md`
- `docs/ADR/ADR-030-command-actuation-protocol.md`
- `docs/EDD/EDD-006-mapeo-canales-actuadores.md`
- `docs/contracts/conformance/README.md`
- `simulation-platform-roadmap.md`
