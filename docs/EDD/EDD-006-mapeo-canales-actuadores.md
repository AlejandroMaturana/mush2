# EDD-006 — Mapeo Canónico de Canales de Actuadores

## Metadata

| Campo             | Valor                            |
| ----------------- | -------------------------------- |
| Autor             | ISSUE-030                        |
| Estado            | ACCEPTED                         |
| Fecha             | 2026-07-30                       |
| ADRs relacionados | ADR-001, ADR-003, ADR-008, ADR-021, ADR-025, ADR-028 |
| RFC relacionados  | RFC-0009                         |
| EDD relacionados  | EDD-001, EDD-002                 |

---

## 1. Problema / Contexto

El sistema Mush2 controla 4 actuadores físicos mediante 4 relés SSR conectados a GPIO del ESP32-S3. Cada actuador tiene una función específica y está cableado a un pin fijo. Actualmente existen **tres mapeos divergentes** de canal y función:

| Función | controlEngine.js (prod) | ComputeActuators.ts (no usado) | Firmware — hardware real |
|---------|------------------------|-------------------------------|--------------------------|
| Ventilación (FAE) | Ch1 | Ch0 (llamado "Fan") | **CH1** (GPIO 11) |
| Heater | Ch2 | Ch1 | **CH2** (GPIO 12) |
| Humidificador | Ch3 | Ch2 | **CH3** (GPIO 13) |
| Iluminación | — | — | **CH4** (GPIO 14) |

### Divergencias concretas

1. `ComputeActuators.ts` usa **0-indexed** (Ch0, Ch1, Ch2) — incompatible con el resto del sistema (DB, API, MQTT, firmware usan 1-indexed CH1-CH4)
2. `ComputeActuators.ts` nombra **"Fan"** a lo que en todas partes es **Ventilación** — siendo el mismo actuador físico
3. **Light (CH4) solo existe en firmware** — el backend no reconoce este canal
4. **Ningún documento formaliza el mapeo** como fuente única de verdad. La única referencia GPIO→función está en comentarios de `config.example.h`
5. El firmware tiene un **remapeo interno** en `tasks.cpp` para compensar la diferencia de índices entre el hysteresis controller y el SSR físico

Identificado como **H-101** (crítico, bloqueante) en el análisis arquitectónico de RFC-0009.

---

## 2. Objetivos

- Definir **mapeo canónico** CH1-CH4 → ActuatorType → GPIO como invariante de dominio
- Separar **identidad física** (`channel`: 1-4, canal SSR) de **identidad funcional** (`ActuatorType`: VENTILATION, HEATER, HUMIDIFIER, LIGHT)
- Establecer catálogo canónico con nombres internos estables (inglés, sin ambigüedad)
- Formalizar contrato de representación común entre firmware, backend, MQTT, API REST y tests
- Reforzar CH4 como miembro completo del dominio (aunque su control pueda estar delegado al firmware local)
- Actualizar DDD-001, RFC-0009 y ADRs relacionados
- Definir invariantes de prueba para prevenir regresiones

---

## 3. No-objetivos

- No define el protocolo de comunicación (lo cubre RFC-0009)
- No define la lógica de control (lo cubren ADR-021, EDD-002 y EDD-005)
- No modifica el hardware ni el cableado SSR existente
- No cambia el funcionamiento del hysteresis controller local
- No decide si Light se controla desde backend o solo localmente (define que pertenece al modelo, la estrategia de control es decisión separada)

---

## 4. Alternativas consideradas

### 4.1 Computed Actuators 0-indexed (Ch0=Fan, Ch1=Heater, Ch2=Humid)

| Pros | Contras |
|------|---------|
| Convención de programación (arrays 0-indexed) | Incompatible con toda la base existente: DB, API, MQTT y firmware usan 1-indexed |
| | El hardware SSR usa CH1-CH4 físicamente etiquetados |
| | Migrar todo el sistema es breaking change masivo |
| | Ch0 no tiene sentido físico (no existe "canal 0" en el SSR) |
| **Decisión: ❌ Descartado** | |

### 4.2 Solo controlEngine.js (Ch1=Vent, Ch2=Heat, Ch3=Humid, sin Light)

| Pros | Contras |
|------|---------|
| Coincide con producción actual | Omite Light (CH4) — existe en hardware pero no en modelo |
| | No resuelve la falta de documentación formal |
| | Deja la ambigüedad Fan vs Vent sin resolver |
| **Decisión: ❌ Descartado** — no incorpora CH4 al modelo de dominio | |

### 4.3 Mapeo del firmware como canónico — **ELEGIDA**

| Pros | Contras |
|------|---------|
| **GPIO es la invariante física**: los pines están soldados a relés específicos | Requiere actualizar `ComputeActuators.ts` para alinearse |
| El firmware es la autoridad de ejecución — el mapeo debe reflejar la realidad del hardware | Requiere agregar CH4 al modelo de backend |
| Coincide con los comentarios en `config.example.h` (única fuente previa) | |
| `controlEngine.js` ya coincide en CH1-CH3 (solo falta CH4) | |
| El SSR controller es 1-indexed en todo el código base | |
| **Decisión: ✅ Elegido** — ver §5 | |

### 4.4 Mapeo abstracto desacoplado (sin numeración fija por capa)

| Pros | Contras |
|------|---------|
| Máxima flexibilidad, cada capa mapea internamente | Agrega complejidad innecesaria para 4 canales fijos |
| | Dificulta depuración: mismo `channel:1` tendría significado distinto según capa |
| | Violaría INV-007 (Command Determinism) de RFC-0009 |
| **Decisión: ❌ Descartado** — sobreingeniería para el caso actual | |

---

## 5. Solución propuesta

### 5.1 Separación de identidad: channel (físico) vs ActuatorType (funcional)

El `channel` representa únicamente el **canal físico SSR** (1-4). No debe usarse como identidad de dominio. El `ActuatorType` es la **identidad funcional** del actuador, independiente de su posición física.

```typescript
type ActuatorType = 'VENTILATION' | 'HEATER' | 'HUMIDIFIER' | 'LIGHT';
```

### 5.2 Tabla canónica

| channel | ActuatorType | GPIO | SSR | Propósito |
|---------|-------------|------|-----|-----------|
| **1** | **VENTILATION** | GPIO 11 | Relay 1 | Renovación de aire, control de CO₂ y temperatura |
| **2** | **HEATER** | GPIO 12 | Relay 2 | Manta térmica para control de temperatura |
| **3** | **HUMIDIFIER** | GPIO 13 | Relay 3 | Ultrasonic humidificador para control de HR |
| **4** | **LIGHT** | GPIO 14 | Relay 4 | Luz LED para ciclo día/noche |

### 5.3 Catálogo canónico de ActuatorType

| ActuatorType | channel fijo | Nombres humanos aceptados | Sinónimos prohibidos en contratos |
|-------------|-------------|--------------------------|----------------------------------|
| VENTILATION | 1 | "Ventilación", "Vent", "Extractor", "FAE" | `"Fan"`, `"Ventilador"` |
| HEATER | 2 | "Calefacción", "Heater", "Calefactor" | `"Calor"`, `"Heat"` |
| HUMIDIFIER | 3 | "Humidificación", "Humidifier", "Humid" | `"Humidity"`, `"Vapor"` |
| LIGHT | 4 | "Iluminación", "Light", "Luz", "Fotoperiodo" | `"LED"`, `"Lamp"` |

### 5.4 Reglas del mapeo

| ID | Regla | Aplica a |
|----|-------|----------|
| **RM-001** | Los canales son **1-indexados** (CH1-CH4) en todos los componentes del sistema: firmware, backend, base de datos, API REST, MQTT y documentación | Todos |
| **RM-002** | "Fan" y "Ventilación" son el mismo actuador físico (CH1). El `ActuatorType` canónico es `VENTILATION` | Backend, firmware, contratos |
| **RM-003** | El mapeo CH → GPIO es inmutable sin nuevo EDD que lo acompañe de cambios de hardware | Hardware, firmware |
| **RM-004** | `channel` identifica el **canal físico** (SSR). `ActuatorType` identifica la **función**. Toda comunicación entre capas debe incluir ambos o usar `channel` con tabla de referencia a este EDD | Contratos entre capas |
| **RM-005** | CH4 (LIGHT) pertenece al modelo completo del sistema. Su estrategia de control puede estar delegada al firmware local, pero el canal existe en todo contrato | Backend, API, MQTT, DDD |
| **RM-006** | Este EDD predomina sobre cualquier definición anterior en ADRs, DDDs u otros documentos | Documentación |

---

## 6. Contrato entre capas

### 6.1 Representación común

Toda comunicación entre capas (firmware ↔ backend ↔ API ↔ MQTT) debe cumplir:

| Campo | Tipo | Valores válidos | Obligatorio | Descripción |
|-------|------|----------------|-------------|-------------|
| `channel` | `uint8` | 1, 2, 3, 4 | Sí | Canal físico SSR |
| `state` | `uint8` | 0 (OFF), 1 (ON) | Sí | Estado del actuador |
| `type` | `string` | `"VENTILATION"`, `"HEATER"`, `"HUMIDIFIER"`, `"LIGHT"` | No (recomendado) | ActuatorType — identidad funcional |

### 6.2 Comportamiento ante canal inválido

- Si `channel` está fuera de rango (≠ 1, 2, 3, 4): el mensaje completo debe ser **rechazado** sin cambios de estado
- Si `channel` es válido pero `state` no es 0 ni 1: debe tratarse como OFF por seguridad
- Si `type` no coincide con el `channel` en la tabla canónica: se emite una advertencia pero se ejecuta igual (el `channel` es la autoridad, `type` es informativo)

### 6.3 Contrato por capa

| Capa | Formato de referencia | Canal usado | Incluye ActuatorType |
|------|-----------------------|-------------|---------------------|
| **Firmware — SSR controller** | `ssr.setChannel(channel, state)` | 1-4 (uint8) | No (implícito por pinout) |
| **Firmware — MQTT handler** | `mqtt_client.cpp: actuatorDesired[ch-1]` | 1-4 en wire, convertido a 0-3 interno | Sí (recomendado en payload) |
| **Firmware — HTTP poller** | `http_poller.cpp: getDesired(ch, &state, &mode)` | 1-4 | No (solo channel en response) |
| **Backend — Model** | `Actuator.js: {deviceId, channel, state, mode}` | 1-4 | No (implícito por EDD-006) |
| **Backend — ControlEngine** | `controlEngine.js: {channel, command}` | 1-4 | No (solo channel) |
| **Backend — ComputeActuators** | `ComputeActuators.ts` | **debe migrar** de 0-2 a 1-4 | Sí (return type enum) |
| **Backend — MQTT Bridge** | `mqttBridge.js: publish(actuatorMsg)` | 1-4 | Sí (incluir en payload futuro) |
| **API REST** | `PATCH /actuators/:channel` | 1-4 en path param | No (path param es channel) |
| **MQTT wire** | `mush2/{deviceId}/actuators` | 1-4 en payload JSON | Sí (recomendado) |
| **Tests** | Contract tests | 1-4 únicamente | Según nivel de test |

---

## 7. Revisión de firmware: remapeos internos

### 7.1 Análisis del pipeline SSR

```
hysteresis_controller.cpp::evaluate()      tasks.cpp::taskSSR()          ssr_controller.cpp
──────────────────────────────────────     ─────────────────────         ─────────────────
ssrOutputs[0] = heat                       hystOutputs[1] → finalState[0] → setChannel(1, ...)
ssrOutputs[1] = vent                       hystOutputs[0] → finalState[1] → setChannel(2, ...)
ssrOutputs[2] = humid                      hystOutputs[2] → finalState[2] → setChannel(3, ...)
ssrOutputs[3] = light                      hystOutputs[3] → finalState[3] → setChannel(4, ...)
```

### 7.2 Remapeo detectado

En `tasks.cpp:281-286` existe un **remapeo explícito** que intercambia los índices [0] y [1]:

```cpp
uint8_t finalState[4] = {
    hystOutputs[1],  // CH1 = Ventilación  ← antes era ssrOutputs[0] = heat
    hystOutputs[0],  // CH2 = Calefacción   ← antes era ssrOutputs[1] = vent
    hystOutputs[2],  // CH3 = Humidificación
    hystOutputs[3],  // CH4 = Iluminación
};
```

**Causa raíz**: el hysteresis controller asigna internamente:
- `evaluate()` asume `ssrOutputs[0] = heat` como primer índice
- Pero el hardware tiene CH1 = Ventilación (GPIO 11)

El remapeo es la forma correcta de compensar — pero agrega un punto de desajuste.

### 7.3 Arquitectura objetivo

Eliminar el remapeo. El hysteresis controller debe producir índices alineados con el mapeo canónico:

```
ssrOutputs[0] = vent      → CH1 (GPIO 11)
ssrOutputs[1] = heat      → CH2 (GPIO 12)
ssrOutputs[2] = humid     → CH3 (GPIO 13)
ssrOutputs[3] = light     → CH4 (GPIO 14)
```

Esto requiere cambiar `hysteresis_controller.cpp`:
- En `evaluate()`, intercambiar los índices de heat y vent
- En `shouldHeat()` y `shouldVentilate()`: la lógica no cambia, solo la posición en el array de salida
- En `setOverheat()`: `ssrOutputs[0] = 0` (vent OFF), `ssrOutputs[1] = 1` (heat OFF) — fail-safe debe ventilar (CH1=ON, CH2=OFF)
- En overheat recovery: `ssrOutputs[0] = 0`, `ssrOutputs[1] = 0` — consistente

### 7.4 Transición planificada

| Paso | Acción | Riesgo |
|------|--------|--------|
| 1 | Documentar remapeo actual en código (ya hecho en este EDD) | Ninguno |
| 2 | Agregar constantes simbólicas: `IDX_VENT=0, IDX_HEAT=1, IDX_HUMID=2, IDX_LIGHT=3` | Bajo |
| 3 | Intercambiar índices en `evaluate()` y eliminar remapeo en `tasks.cpp` | **Medio** — requiere verificación en hardware real |
| 4 | Validar overheat fail-safe (CH1=ON, CH2=OFF) | Alto — seguridad |
| 5 | Si el paso 3-4 tiene riesgo operativo, mantener remapeo como deuda técnica y diferir | Bajo |

**Recomendación**: el paso 1 debe hacerse ahora (documentación). Los pasos 2-5 en una OTA dedicada con pruebas en hardware real, no como parte de la implementación del protocolo.

---

## 8. Invariantes de prueba (contract tests)

Propuesta de tests para prevenir regresiones:

| ID | Invariante | Descripción | Tipo |
|----|-----------|-------------|------|
| CH-T01 | `channel` 0 inválido | Ninguna capa debe aceptar `channel=0` como válido. Debe ser rechazado | Unit / Contract |
| CH-T02 | `channel` 5+ inválido | Cualquier `channel > 4` debe ser rechazado | Unit / Contract |
| CH-T03 | `channel` 1-4 válidos | Solo 1, 2, 3, 4 producen cambios de estado | Unit / Contract |
| CH-T04 | CH1 ≡ VENTILATION | En cualquier representación que incluya `ActuatorType`, CH1 debe corresponder a VENTILATION | Contract |
| CH-T05 | CH2 ≡ HEATER | CH2 corresponde a HEATER | Contract |
| CH-T06 | CH3 ≡ HUMIDIFIER | CH3 corresponde a HUMIDIFIER | Contract |
| CH-T07 | CH4 ≡ LIGHT | CH4 corresponde a LIGHT. CH4 siempre existe en el modelo | Contract |
| CH-T08 | GPIO mapping único | Cada GPIO (11, 12, 13, 14) se asigna a exactamente un CH | Unit |
| CH-T09 | GPIO → CH biyectivo | Cada CH corresponde a exactamente un GPIO | Unit |
| CH-T10 | `Fan` no permitido como ActuatorType | `"Fan"` no es un valor válido para `ActuatorType` en ningún contrato | Contract |
| CH-T11 | `channel` en DDD-001 | DDD-001 §2.4 debe decir canales 1-4, no 0-3 | Doc review |
| CH-T12 | `channel` inválido no muta estado | Si se recibe un comando con `channel` inválido, ningún actuador debe cambiar de estado | Integration |
| CH-T13 | Overheat fail-safe consistente | fail-safe debe activar CH1 (VENTILATION) y desactivar CH2 (HEATER), independientemente del remapeo interno | Integration |

---

## 9. Actualización de referencias en documentos existentes

### 9.1 DDD-001 — Modelo de Dominio

**§2.4 Hardware — actual:**

> Canal: Canal de salida del actuador (0-3), cada uno controla un equipo diferente

**Debe decir:**

> **Canal (channel)**: Canal físico SSR (1-4). Ver EDD-006 para mapeo canónico.
>
> **ActuatorType**: Identidad funcional del actuador: `VENTILATION` (CH1), `HEATER` (CH2), `HUMIDIFIER` (CH3), `LIGHT` (CH4). A diferencia de `channel` (qué relé físico), `ActuatorType` define la función del actuador en el dominio.

**§4.3 Device — Actuator[] — actual:**

```typescript
Actuator[] (entidades internas)
  ├── id: number
  ├── channel: number
  ├── state: ActuatorState
  ├── mode: ActuatorMode
  └── overrideUntil: Date
```

**Debe agregar:**

```typescript
  ├── type: ActuatorType  // VENTILATION | HEATER | HUMIDIFIER | LIGHT
```

### 9.2 RFC-0009 — Pregunta Q5

**Cerrar Q5 con:**

> Resuelta por EDD-006. El mapeo canónico CH1=VENTILATION, CH2=HEATER, CH3=HUMIDIFIER, CH4=LIGHT es la fuente de verdad. Este RFC adopta ese mapeo. Ver `docs/EDD/EDD-006-mapeo-canales-actuadores.md`.

### 9.3 ADRs relacionados

| ADR | Acción |
|-----|--------|
| ADR-001 (ESP32-S3) | Agregar referencia: el mapeo CH→GPIO está definido en EDD-006 |
| ADR-003 (SSR 4ch) | Agregar referencia: el mapeo CH→función está definido en EDD-006 |
| ADR-008 (HTTP Command) | Agregar nota: el mapeo de canales está formalizado en EDD-006; ADR-008 no define mapping semántico |
| ADR-021 (Control Engine) | Agregar referencia: el mapeo de salida de ComputeActuators debe alinearse con EDD-006 |
| ADR-025 (Device Status) | Agregar referencia: los actuadores referenciados en el modelo de salud del dispositivo usan CH1-CH4 según EDD-006 |
| ADR-028 (MQTT Identity) | Agregar referencia: los comandos de actuación viajan con CH1-CH4 según EDD-006 |

---

## 10. Archivos afectados y cambios requeridos

### 10.1 Por prioridad

#### Alta (previo a implementar pipeline de RFC-0009)

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `backend/src/application/use-cases/ComputeActuators.ts` | Migrar de 0-indexed a 1-indexed; Fan→VENTILATION; agregar CH4 | Pendiente |
| `backend/src/__tests__/application/ComputeActuators.test.ts` | Actualizar tests al nuevo mapeo | Pendiente |
| `docs/RFC/RFC-0009-command-actuation-protocol.md` | Cerrar Q5 | Pendiente |
| `docs/DDD/DDD-001-domain-model.md` | §2.4: canal 0-3 → 1-4; agregar ActuatorType | Pendiente |

#### Media (durante implementación del protocolo)

| Archivo | Cambio | Estado |
|--------|--------|--------|
| `backend/src/services/controlEngine.js` | Agregar CH4 al rango de salida (delegado a firmware local) | Pendiente |
| `backend/src/routes/actuators.js` | Incluir CH4 en respuesta | Pendiente |
| `backend/src/services/mqttBridge.js` | Incluir CH4 en publicaciones | Pendiente |
| `backend/src/models/Actuator.js` | Validar channel 1-4 (actualmente 1-3); agregar campo `type` opcional | Pendiente |
| `firmware/src/hysteresis_controller.cpp` | Agregar constantes simbólicas `IDX_VENT=0, IDX_HEAT=1, IDX_HUMID=2, IDX_LIGHT=3` | Pendiente |

#### Baja (post-RFC-0009, OTA dedicada)

| Archivo | Cambio | Estado |
|--------|--------|--------|
| `firmware/src/hysteresis_controller.cpp` | Intercambiar índices heat/vent en `evaluate()` | Pendiente (riesgo operativo) |
| `firmware/src/tasks.cpp` | Eliminar remapeo `hystOutputs[1]→finalState[0]` y `hystOutputs[0]→finalState[1]` | Pendiente (depende de paso anterior) |
| `firmware/src/config.example.h` | Promover comentarios a definición formal (`CHANNEL_FUNCTION` enum) | Pendiente |

### 10.2 Documentos a actualizar

| Documento | Cambio | Prioridad |
|-----------|--------|-----------|
| `docs/DDD/DDD-001-domain-model.md` | §2.4, §4.3 — ver §9.1 de este EDD | Alta |
| `docs/RFC/RFC-0009-command-actuation-protocol.md` | Cerrar Q5 — ver §9.2 de este EDD | Alta |
| `docs/ADR/ADR-001-ESP32.md` | Agregar referencia a EDD-006 | Media |
| `docs/ADR/ADR-003-SSR-low-level-04ch.md` | Agregar referencia a EDD-006 | Media |
| `docs/ADR/ADR-008-HTTP-Command-Protocol.md` | Agregar nota de mapping formalizado | Media |
| `docs/ADR/ADR-021-control-engine-as-orchestrator.md` | Agregar referencia a EDD-006 | Media |

---

## 11. Riesgos detectados

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Cambio en ComputeActuators.ts rompe tests existentes | Media | Medio | No está en producción. Tests se actualizan junto con código |
| Algún componente olvida migrar y usa mapeo antiguo | Media | Alto | Este EDD es la fuente de verdad. Todo PR debe referenciarlo. Contract tests (CH-T01 a CH-T13) detectarán desajustes |
| Remapeo de firmware (paso 3-4 en §7.4) causa error de overheat | Baja | **Crítico** | Diferir a OTA dedicada con pruebas en hardware real. Mientras tanto, mantener el remapeo actual |
| Se agrega un 5° actuador sin actualizar este EDD | Baja | Medio | RM-003 exige nuevo EDD para cambios de GPIO mapping |
| CH4 en modelo pero sin lógica de backend crea confusión | Baja | Bajo | §5.4 RM-005 documenta explícitamente que la estrategia de control es decisión separada |

---

## 12. Propuesta de implementación por fases

| Fase | Contenido | Depende de | Release |
|------|-----------|-----------|---------|
| **F1** | Aprobar EDD-006 (DRAFT → REVIEW → ACCEPTED). Cerrar Q5 en RFC-0009. Actualizar DDD-001 | — | Documentación |
| **F2** | Migrar `ComputeActuators.ts` y tests. Agregar constantes simbólicas en hysteresis_controller | F1 | Backend sprint |
| **F3** | Agregar CH4 a `controlEngine.js`, `routes/actuators.js`, `mqttBridge.js`, `Actuator.js` model | F1 | Backend sprint |
| **F4** | Eliminar remapeo en firmware (intercambiar índices en hysteresis_controller + eliminar remap en tasks.cpp). Actualizar `config.example.h` | F1, **validación hardware** | OTA dedicada |
| **F5** | Contract tests automatizados (CH-T01 a CH-T13) | F2 | Calidad |

---

## 13. Métricas de éxito

| Métrica | Objetivo | Estado |
|---------|----------|--------|
| Divergencias de mapeo en código | 0 | 🟡 3 mapeos vigentes |
| Documentación formal del mapeo | 1 fuente única (este EDD) | 🟡 DRAFT |
| CH4 reconocido en backend | Presente en modelo, API y MQTT | 🟡 Ausente |
| ComputeActuators.ts alineado | 1-indexed, ActuatorType canónico | 🟡 0-indexed, "Fan" |
| Remapeo interno en firmware | 0 (eliminado) | 🟡 1 remapeo vigente |
| Contract tests de canales | Suite ≥ 10 tests | 🟡 No existen |

---

## 14. Referencias

- `firmware/src/config.example.h` — Comentarios GPIO→función (fuente previa no formal)
- `firmware/src/hysteresis_controller.cpp` — Índices internos del control local
- `firmware/src/tasks.cpp` — Remapeo de índices en taskSSR
- `firmware/src/ssr_controller.cpp` — Driver SSR CH1-CH4 (1-indexed)
- `backend/src/services/controlEngine.js` — Mapping legacy (CH1=VENT, CH2=HEAT, CH3=HUMID)
- `backend/src/application/use-cases/ComputeActuators.ts` — Mapping desalineado (Ch0=Fan, Ch1=Heater, Ch2=Humid)
- `docs/DDD/DDD-001-domain-model.md` — §2.4 canal 0-3 (debe actualizarse)
- `docs/RFC/RFC-0009-command-actuation-protocol.md` — Pregunta Q5 (debe cerrarse)
- `docs/EDD/EDD-001-sistema-control-ambiental.md` — §2: "4 actuadores (ventilación, calefacción, humidificación, iluminación)"
- `docs/ADR/ADR-001-ESP32.md` — Selección de hardware ESP32-S3
- `docs/ADR/ADR-003-SSR-low-level-04ch.md` — SSR 4 canales
- `docs/ADR/ADR-008-HTTP-Command-Protocol.md` — Protocolo HTTP (sin mapping formal)
- `docs/ADR/ADR-021-control-engine-as-orchestrator.md` — Arquitectura del control engine
- `docs/ADR/ADR-025-device-status-policy.md` — Política de estado de dispositivo
- `docs/ADR/ADR-028-Per-Device-MQTT-Identity.md` — Identidad MQTT por dispositivo
- `ISSUE-#160 Command & Actuation Protocol — pipeline cmdId, ACK MQTT y contrato canónico` — ISSUE que originó este análisis (H-101)
