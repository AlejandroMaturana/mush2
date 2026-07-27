# ADR-025: Device Status Policy

**Estado:** Aceptado

**Fecha:** 2026-07-25

**Autores:** Equipo Mush2

**Decisores:** Equipo Mush2

---

# Resumen

Se adopta un modelo multidimensional compuesto para el estado de dominio del dispositivo, compuesto por tres dimensiones independientes: Connectivity, Health y Lifecycle. Cada dimensión se determina por una fuente de datos distinta y tiene su propio ciclo de vida. Esto reemplaza el ENUM plano actual (`ONLINE | OFFLINE | MAINTENANCE | ERROR | STALE | DEGRADED | RETIRED`) que no logra representar la condición real del dispositivo.

---

# Contexto

## Situación actual

El sistema determina el estado del dispositivo de forma inconsistente entre capas:

- **Firmware**: Implementa una FSM con 10 estados + publica health metrics detalladas
- **Backend**: Computa 7 estados usando exclusivamente timing de `lastSeen`, ignorando las health metrics del firmware
- **Frontend**: Define el estado en 5 ubicaciones diferentes con representaciones visuales inconsistentes

## Problema

No existe una Device Status Policy que defina:

- Cómo combinar las múltiples fuentes de información del dispositivo
- Qué precedencia tiene cada fuente ante contradicciones
- Cómo se traduce la FSM del firmware al modelo de dominio
- Cómo se representa visualmente el estado compuesto

## Consecuencias de no actuar

- El dashboard no refleja el estado real del dispositivo
- Un dispositivo con `ST_ERROR` en firmware y `lastSeen` reciente se muestra como `ONLINE`
- Las health metrics del firmware se pierden en el cómputo de estado
- Cada vista del frontend interpreta el estado a su manera

---

# Decisión

## 1. Modelo multidimensional compuesto

El estado de dominio del dispositivo se compone de tres dimensiones independientes:

```json
{
  "connectivity": "ONLINE | DEGRADED | OFFLINE",
  "health": "NORMAL | WARNING | ERROR | null",
  "lifecycle": "PROVISIONING | ACTIVE | MAINTENANCE | RETIRED"
}
```

Cada dimensión se determina por una fuente de datos distinta:

| Dimensión | Fuente | Determinación |
|-----------|--------|---------------|
| Connectivity | `lastSeen` + umbrales configurables | Timing de última comunicación |
| Health | Health metrics del firmware (`heartbeatsHealthy`, `i2cHealthy`, `bootTestPassed`) | Métricas de hardware |
| Lifecycle | Estado administrativo del dispositivo | maintenanceMode, retired |

## 2. Separación de determinación

- **Firmware** reporta: FSM state + health metrics + heartbeat
- **Backend** determina: Connectivity (por timing), Health (por metrics), Lifecycle (por estado administrativo)
- **Frontend** consume: Objeto compuesto `status` con las tres dimensiones

## 3. Precedencia en contradicciones

| Regla | Descripción |
|-------|-------------|
| Lifecycle > todo | Si lifecycle es MAINTENANCE o RETIRED, las otras dimensiones no se evalúan para UI |
| Connectivity > Health | Si el dispositivo está OFFLINE, health se establece en `null` (sin datos frescos) |
| Health modula Connectivity | Un dispositivo puede estar ONLINE pero con health ERROR |

## 4. Desacoplamiento de la FSM

La FSM del firmware **no se expone directamente** al dominio. Se traduce a través de las health metrics. Esto permite que el backend determine el estado de dominio independientemente de los 10 estados internos del firmware.

## 5. Persistencia

El modelo compuesto se persiste como columnas separadas en la tabla Device (o como un campo JSON), no como un ENUM plano. La API expone el objeto compuesto.

---

# Justificación

## Ventajas

- **Precisión**: Cada dimensión captura un aspecto distinto de la condición del dispositivo
- **Extensibilidad**: Nuevas dimensiones o valores se agregan sin romper contratos existentes
- **Desacoplamiento**: El frontend no depende de la FSM interna del firmware
- **Consistencia**: Una sola fuente de verdad para la representación visual
- **Transparencia**: El usuario puede ver connectivity y health independientemente

## Problemas resueltos

- Un dispositivo `ONLINE` pero con `health: ERROR` ahora se representa correctamente
- Las health metrics del firmware finalmente se usan en el cómputo de estado
- Las 5 definiciones duplicadas en frontend se reemplazan por una sola
- La ambigüedad de `DEGRADED` se resuelve: connectivity degraded ≠ health warning

## Trade-offs aceptados

- Mayor complejidad en el cómputo de estado (3 dimensiones vs 1 ENUM)
- El frontend necesita representar más información (pero puede simplificar según la vista)
- Requiere migración de datos existentes en la DB

---

# Alternativas consideradas

## Alternativa A: ENUM plano ampliado

Mantener un ENUM plano pero con más valores: `ONLINE | DEGRADED | STALE | OFFLINE | MAINTENANCE | RETIRED | ERROR`

### Ventajas

- Simple de implementar
- Compatibilidad con modelo existente
- Un solo campo en DB

### Desventajas

- No resuelve la ambigüedad de `DEGRADED` (¿WiFi o latencia?)
- Pierde la granularidad de las health metrics
- Cada nuevo estado requiere actualizar ENUM, DB, backend y frontend
- Un solo valor no puede representar "ONLINE pero con ERROR"

### Motivo del descarte

No resuelve el problema fundamental: el estado del dispositivo es multidimensional y un ENUM plano no puede representar esa composición.

## Alternativa B: Modelo jerárquico con precedencia

Un solo valor de estado calculado con reglas de precedencia:

```
MAINTENANCE > RETIRED > ERROR > OFFLINE > DEGRADED > ONLINE
```

### Ventajas

- Simple de consumir (un solo valor)
- Fácil de mostrar en UI (un badge)

### Desventajas

- Pierde información: un dispositivo `ERROR` puede estar `ONLINE` pero el usuario no lo sabe
- Las reglas de precedencia son rígidas y difíciles de extender
- No resuelve la representación visual (sigue siendo un solo color/badge)

### Motivo del descarte

Demasiado simplista. El usuario necesita ver múltiples dimensiones de la condición del dispositivo.

---

# Consecuencias

## Positivas

- El dashboard refleja fielmente la condición real del dispositivo
- Las health metrics del firmware se integran al modelo de dominio
- Una sola fuente de verdad para la representación visual en frontend
- Mejor diagnóstico: el usuario puede distinguir entre problemas de conectividad y problemas de hardware
- Extensible para futuras dimensiones (ej. calidad de red, carga del sistema)

## Negativas

- Complejidad adicional en `deviceHealthService.js` para computar tres dimensiones
- Migración de datos requerida (ENUM plano → modelo compuesto)
- El frontend necesita lógica para determinar qué dimensión mostrar como badge principal
- Todos los componentes frontend que consumen estado deben actualizarse

## Riesgos

- Si las health metrics del firmware no son suficientes, la dimensión Health puede quedar como `null` (requiere evolución del firmware)
- La migración puede causar un período transitorio donde el estado no se muestra correctamente
- El SSE `device_status_changed` debe actualizarse para transmitir el objeto compuesto

---

# Impacto en la arquitectura

| Componente | Impacto |
|------------|---------|
| **Firmware** | Sin cambios. Ya expone FSM state + health metrics. La traducción al dominio es responsabilidad del backend |
| **Backend** | Alto. Reescritura de `computeStatus()` para modelo multidimensional. Nuevo contrato de API. Actualización de DB ENUM → modelo compuesto. Actualización de domain events |
| **Frontend** | Alto. Fuente única de verdad para representación visual. Eliminación de 5 definiciones duplicadas. Actualización de todas las vistas que consumen estado. Consumo de SSE `device_status_changed` |
| **API** | Medio. Nuevo payload de estado compuesto. Backward compatibility temporal |
| **Hardware** | Sin cambios |
| **Documentación** | Medio. DDD-003 §6 y DDD-005 §5 deben actualizarse. DDD-008 es la fuente nueva |

---

# Reglas derivadas

| ID | Regla |
|----|-------|
| ADR-025-01 | El estado de dominio del dispositivo es la composición de Connectivity, Health y Lifecycle |
| ADR-025-02 | Connectivity se determina exclusivamente por timing de `lastSeen` |
| ADR-025-03 | Health se determina exclusivamente por health metrics del firmware |
| ADR-025-04 | Lifecycle se determina por estado administrativo (maintenanceMode, retired) |
| ADR-025-05 | La FSM del firmware no se expone directamente al dominio; se traduce a través de health metrics |
| ADR-025-06 | El frontend consume el objeto compuesto, no valores planos |
| ADR-025-07 | Una sola fuente de verdad define la representación visual del estado |
| ADR-025-08 | Los umbrales de conectividad son configurables por dispositivo |
| ADR-025-09 | El evento `device_status_changed` transmite el objeto compuesto completo |
| ADR-025-10 | Un dispositivo en MAINTENANCE o RETIRED tiene máxima precedencia en UI |

---

# Implementación

## Contrato de datos (API)

```json
{
  "status": {
    "connectivity": "ONLINE",
    "health": "NORMAL",
    "lifecycle": "ACTIVE"
  },
  "lastSeen": "2026-07-25T15:00:00Z",
  "secondsSinceLastSeen": 5,
  "diagnostics": {
    "i2c": "OK",
    "sensorAht21": "OK",
    "sensorEns160": "OK",
    "heartbeatsHealthy": true,
    "staleTaskMask": 0,
    "bootTestPassed": true
  }
}
```

## Evento SSE

```json
{
  "type": "device_status_changed",
  "payload": {
    "deviceId": "mush2-001",
    "previousStatus": {
      "connectivity": "ONLINE",
      "health": "NORMAL",
      "lifecycle": "ACTIVE"
    },
    "status": {
      "connectivity": "OFFLINE",
      "health": null,
      "lifecycle": "ACTIVE"
    }
  }
}
```

## Persistencia

Opción A (columnas separadas):
```sql
ALTER TABLE devices
  ADD COLUMN connectivity VARCHAR(20) DEFAULT 'OFFLINE',
  ADD COLUMN health VARCHAR(20),
  ADD COLUMN lifecycle VARCHAR(20) DEFAULT 'ACTIVE';
```

Opción B (campo JSON):
```sql
ALTER TABLE devices
  ADD COLUMN status JSONB DEFAULT '{"connectivity":"OFFLINE","health":null,"lifecycle":"ACTIVE"}';
```

---

# Validación

| # | Criterio | Verificación |
|---|----------|-------------|
| 1 | Consistencia visual | Todos los badges de estado muestran la misma información para el mismo dispositivo |
| 2 | Health integrada | Un dispositivo con `i2cHealthy: false` muestra `health: ERROR` sin importar su conectividad |
| 3 | Precedencia | Un dispositivo en MAINTENANCE muestra badge de MAINTENANCE sin importar connectivity o health |
| 4 | Tiempo real | Los cambios de estado se reflejan en el dashboard via SSE sin polling |
| 5 | Backward compat | La API anterior (`status: "ONLINE"`) puede mapearse al modelo nuevo durante migración |
| 6 | Documentación | DDD-003, DDD-005 y DDD-008 están alineados con la implementación |

---

# ADR relacionados

- ADR-009 — Estrategia de control por histéresis (depende del estado del dispositivo)
- ADR-010 — Mecanismo Fail-Safe Overheat (transiciones de estado por emergencia)
- ADR-017 — Event Bus (transporte de eventos de transición de estado)
- ADR-021 — Control engine como orquestador (consumidor del estado)

---

# Referencias

- DDD-008: Device Status Policy
- DDD-003 §6: Agregado Device (modelo previo)
- DDD-005 §5: Device state machine (modelo previo)
- DDD-006: Domain events
- `backend/src/services/deviceHealthService.js` — Implementación actual
- `firmware/src/state_machine.h` — FSM del firmware
- `firmware/src/health_monitor.h` — Health metrics del firmware

---

# Historial

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-07-25 | Creación |
