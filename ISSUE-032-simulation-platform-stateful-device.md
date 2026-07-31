# ISSUE-032: Simulation Platform — FASE 2 Stateful Device

**Estado:** Proposed

**Fecha:** 2026-07-30

**Autores:** Equipo Mush2

**Documentos relacionados:**
- `ISSUE-031-simulation-platform.md` — ISSUE Rector de la Simulation Platform (FASE 0/0.5/1)
- `AUDIT-001-simulation-platform.md` — Auditoría técnica
- `simulation-platform-roadmap.md` — Roadmap FASE 0-9

---

## FASE 1 — Comprensión del problema

### Problema real

La FASE 1 (Protocol Simulator) produce un Virtual Device que replica la **superficie de mensajes** del dispositivo pero con **valores estáticos** (telemetría fija, sin estado interno evolutivo). Esto limita la utilidad de la plataforma como infraestructura oficial de validación: no es posible validar comportamientos que dependen de la evolución del estado del dispositivo — por ejemplo, la reacción del backend a cambios de telemetría, la persistencia del estado del actuador tras un comando, o la coherencia entre estado simulado y estado reportado.

#### Síntomas actuales

1. Telemetría simulada constante: no se puede ejercitar la reacción del sistema ante variaciones (ej. alza de CO₂, subida de temperatura).
2. Los comandos no tienen efecto observable: un comando de actuación no modifica ninguna magnitud del dispositivo simulado.
3. No hay un modelo de estado que conecte `state` (reportado) con el estado interno del dispositivo.
4. No se puede validar la dimensión temporal del dispositivo (uptime, evolución) sin estado.

#### Causa raíz probable

La FASE 1 fue deliberadamente mínima (solo protocolo). El estado interno fue diferido a esta fase por decisión de alcance, sin definir aún su modelo.

#### Causas secundarias

- El contrato no distingue entre "estado simulado" y "estado reportado"; la política tridimensional (DDD-008) no está materializada en el simulador.
- No existe una representación formal del Virtual Device como entidad con atributos y transiciones.

### Restricciones

#### Técnicas

- El simulador se integra al contrato MQTT oficial; cualquier mensaje que publique debe pasar los validadores de conformance (FASE 0.5).
- El wire usa Unix **segundos** (ADR-026). El reloj interno de la FASE 2 sigue el reloj real (Virtual Time es FASE 6).
- Toda configuración es externa (ISSUE-031, `simulation-platform-issue.md`).

#### Arquitectónicas

- Principios rectores del ISSUE-031: Contract First, Deterministic Simulation, Single Source of Truth, Incremental Fidelity, Observable by Design, Non-invasive Integration.
- El simulador **no** replica lógica de negocio del backend (p. ej. no computa setpoints ni control).
- No se modifica backend ni firmware.
- El estado interno del Virtual Device es un **modelo propio del simulador**, nunca una segunda fuente de verdad del wire.

#### Compatibilidad existente

- La FASE 2 debe evolucionar la FASE 1 sin romper la superficie de mensajes ya implementada.
- Los payloads publicados siguen siendo exactamente los del contrato (telemetry, status, health, alarm, maintenance, ack).

### Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| El modelo de estado replica lógica de negocio del backend | Alta | Alto | El estado es solo magnitudes y atributos del dispositivo; las decisiones quedan en el backend |
| El estado simulado diverge del reportado (drift interno) | Media | Alto | Política de reconciliación explícita: qué se reporta, cuándo, con qué unidad |
| FASE 2 arrastra fidelidad de FASE 3 (Environment Model) | Media | Medio | Exclusiones explícitas; los valores evolucionan por reglas simples, no por modelo físico |
| Determinismo roto por uso de reloj real | Media | Medio | Semilla y reglas deterministas; el reloj real solo define instantes de muestreo |

---

## FASE 1.5 — Domain & System Impact Analysis

### Dominios afectados

| Dominio | Afectación |
|---------|------------|
| **Virtual Device** | Directo — adquiere estado interno |
| **Device Status** | Contractual — se materializa la dimensión tridimensional (DDD-008) en el simulador |
| **Telemetry** | Contractual — los valores ya no son fijos |
| **Command & Actuation** | Contractual — los comandos mutan el estado del actuador simulado |
| **Temporal** | Indirecto — uptime y muestreo periódico dependen del reloj |

### Invariantes afectadas

| Invariante | Implicación |
|------------|-------------|
| El simulador nunca define comportamientos fuera del contrato | Los rangos y unidades de cada magnitud provienen del contrato / ejemplos canónicos |
| Estado reportado ≠ estado interno simulado, pero reconciliable | Definir política de reporting (qué se reporta en `status` vs `telemetry`) |
| Comando → ACK confirma **intención aplicada** | El ACK refleja que el estado del actuador simulado fue actualizado |

### Contratos afectados

| Contrato | Impacto |
|----------|---------|
| MQTT | Ninguno en topics ni payloads — los formatos son los del contrato congelado |
| DDD-008 | Referencia conceptual: estado tridimensional aplicado al Virtual Device |
| EDD Virtual Device Model (FASE 0) | El modelo de estado es su materialización |

### Clasificación del cambio

```
Compatible Change
```

Añade comportamiento interno al simulador sin alterar el contrato del wire.

---

## FASE 2 — Diseño del ISSUE

### Contexto

El Virtual Device de la FASE 1 publica telemetría estática. La FASE 2 introduce **estado interno mutable** gobernado por reglas deterministas:

- Magnitudes ambientales: temperatura, humedad, CO₂, iluminación.
- Estado de actuadores (4 canales, conforme al contrato).
- Atributos de vida: uptime, batería (opcional), firmware version.
- Transiciones: los comandos de actuación mutan el estado de los actuadores; el tiempo real avanza el uptime; reglas simples evolucionan las magnitudes dentro de rangos válidos del contrato.

No hay modelo físico del ambiente (eso es FASE 3). Las magnitudes evolucionan mediante políticas sencillas (deriva acotada, oscilación, decaimiento) configurables externamente.

### Problema

Sin estado interno, la Simulation Platform no puede validar:

1. Reacción del backend ante telemetría variable (alarmas por umbral, persistencia, SSE).
2. El ciclo comando → mutación de estado → ACK con efecto observable.
3. Coherencia estado simulado vs. estado reportado (dimensión tridimensional).
4. Comportamiento temporal del dispositivo (uptime, ciclos de publicación).

### Objetivo inmediato

Definir el **Stateful Device** como evolución del Protocol Simulator: un modelo de estado interno determinista, configurable y observable, que los comandos mutan y que alimenta los mensajes del contrato.

### Objetivo estratégico

El estado interno es el cimiento de FASE 3 (Environment Model), FASE 4 (Scenario Engine) y FASE 5 (Multi Device). Definir el modelo de estado ahora evita reestructurar el Virtual Device en las fases siguientes.

### Alcance

| Incluye | No incluye |
|---------|------------|
| Modelo de estado del Virtual Device (magnitudes, actuadores, atributos) | Modelo físico del ambiente (FASE 3) |
| Reglas simples de evolución determinista de magnitudes | Escenarios configurables (FASE 4) |
| Mutación de estado por comandos de actuación | Múltiples dispositivos (FASE 5) |
| Política de reporting (qué se publica en cada mensaje) | Tiempo virtual / aceleración (FASE 6) |
| Uptime y atributos de vida | Integración CI (FASE 7) |
| Configuración externa del estado inicial | HAL / Digital Twin (FASE 8/9) |
| Observabilidad del estado interno (traza) | Modificación de backend o firmware |

### Exclusiones explícitas

```
OUT OF SCOPE

- Modelo físico del ambiente (pérdida térmica, intercambio de CO₂, evaporación) — FASE 3
- Scenario Engine (eventos, perturbaciones, perfiles configurables) — FASE 4
- Multi Device / Farm — FASE 5
- Virtual Time — FASE 6
- Cualquier cambio en el contrato MQTT, topics o payloads
- Cualquier cambio en backend o firmware
- Lógica de control / setpoints / histéresis (pertenecen al backend o al firmware real)
```

### Principios arquitectónicos

| Principio | Aplicación |
|-----------|------------|
| **Deterministic Simulation** | Misma configuración + misma secuencia de comandos = misma evolución |
| **Contract First** | El estado nunca produce mensajes que fallen los validadores |
| **Single Source of Truth** | El contrato define unidades y rangos; el modelo de estado los respeta |
| **Incremental Fidelity** | FASE 2 añade estado sin reescribir la superficie de mensajes de FASE 1 |
| **Observable by Design** | El estado interno es trazable (snapshot, delta, log) |
| **Configurabilidad** | Estado inicial, rangos y políticas de evolución son externos |

### Riesgos del diseño propuesto

| Riesgo | Mitigación |
|--------|------------|
| El modelo de estado se acopla a la implementación del backend | El estado solo contiene magnitudes del dispositivo; la interpretación es del backend |
| Políticas de evolución arbitrarias generan datos incoherentes | Políticas acotadas a rangos del contrato y validadas |
| El reporting no reconcilia estado interno vs reportado | Política de reporting explícita como entregable |
| Complejidad innecesaria en las políticas | Políticas mínimas (deriva, oscilación, decaimiento) parametrizables |

### Entregables

| Entregable | Descripción |
|------------|-------------|
| EDD — Virtual Device State Model | Atributos, tipos, rangos, transiciones |
| Política de reporting | Qué mensaje reporta qué parte del estado |
| Políticas de evolución | Reglas deterministas de cambio de magnitudes |
| Diagrama de estados | Transiciones del Virtual Device ante comandos y tiempo |
| Configuración de ejemplo | Estado inicial + políticas para un device de referencia |

### Definition of Done

#### Diseño

- [ ] Modelo de estado definido con atributos, tipos, rangos y unidades alineadas al contrato
- [ ] Política de reporting definida (telemetry vs status vs health)
- [ ] Mutación por comandos definida (qué comando cambia qué atributo)
- [ ] Políticas de evolución deterministas definidas y configurables
- [ ] Uptime y atributos de vida definidos

#### Documentación

- [ ] EDD Virtual Device State Model creado
- [ ] Diagrama de estados incluido
- [ ] Configuración de ejemplo incluida

#### Validación

- [ ] Los mensajes emitidos por un Virtual Device con estado pasan los validadores de conformance
- [ ] Un comando muta el estado del actuador y el ACK refleja el nuevo estado
- [ ] Dos ejecuciones con misma configuración y comandos producen secuencias idénticas
- [ ] No contradice los principios rectores del ISSUE-031

---

## FASE 3 — Impacto documental

| Documento | Acción |
|-----------|--------|
| `docs/EDD/EDD-009-virtual-device-state-model.md` | **CREAR** — modelo de estado del Virtual Device |

**Documentos que referenciar (sin modificar):**

| Documento | Relación |
|-----------|----------|
| `ISSUE-031-simulation-platform.md` | ISSUE Rector; FASE 2 hereda sus principios |
| `AUDIT-001-simulation-platform.md` | Evidencia del estado actual |
| `docs/DDD/DDD-008-device-status-policy.md` | Estado tridimensional aplicado al Virtual Device |
| `docs/contracts/mqtt-contract.md` | Fuente de unidades, rangos y payloads |
| `docs/ADR/ADR-026-temporal-contract.md` | Unidades temporales del wire |
| `docs/ADR/ADR-030-command-actuation-protocol.md` | Comandos que mutan el estado |

---

## FASE 4 — Roadmap incremental

### Etapa 1: Modelo de estado

**Objetivo:** definir el EDD del Virtual Device State Model.

**Cambios:** EDD-009 (atributos, rangos, unidades, transiciones); política de reporting.

**Validación:** revisión por un arquitecto; consistencia con ADR-026 y mqtt-contract.

**Criterio de salida:** EDD-009 en estado **Proposed**.

### Etapa 2: Políticas de evolución

**Objetivo:** definir reglas deterministas de evolución de magnitudes.

**Cambios:** políticas (deriva, oscilación, decaimiento) parametrizables; configuración de ejemplo.

**Validación:** las políticas respetan los rangos del contrato; deterministas.

**Criterio de salida:** políticas documentadas y revisadas.

### Etapa 3: Implementación en el Virtual Device

**Objetivo:** el Virtual Device incorpora estado interno y mutación por comandos.

**Cambios:** estado interno, políticas, mutación, observabilidad, reporting.

**Validación:** conformance de mensajes; comando → ACK con efecto; determinismo.

**Criterio de salida:** Stateful Device funcional y validado contra los validadores de conformance.

---

## FASE 5 — GitHub Workflow

**Nombre ISSUE:** `ISSUE-032: Simulation Platform — FASE 2 Stateful Device`

**Branch:**
```
feature/ISSUE-032-simulation-stateful-device
```

**Commits:**
```
docs(edd): create EDD-009 Virtual Device State Model

docs(simulator): add reporting policy and state transitions

feat(simulator): add internal state to Virtual Device

feat(simulator): apply actuator commands to device state

test(simulator): add determinism and conformance tests
```

**Pull Request:** resumen, cambios, riesgos, evidencia de conformance y determinismo, documentación modificada.

**Checklist:**
```
[ ] EDD-009 creado en estado Proposed
[ ] Política de reporting definida
[ ] Diagrama de estados incluido
[ ] Mutación por comandos implementada
[ ] Mensajes pasan validadores de conformance
[ ] Determinismo validado (dos ejecuciones idénticas)
[ ] Sin cambios en contrato MQTT
[ ] Sin cambios en backend ni firmware
[ ] Consistente con ISSUE-031 principios rectores
```

**Versionado:** MINOR (adición de comportamiento interno, sin breaking change de contrato).

---

## FASE 6 — Plan técnico de implementación

> *Se ejecutará como ISSUE(s) separado(s) tras la aprobación de este diseño (FASE 1/2) y de los artefactos de conformance de FASE 0.5.*

### Archivos nuevos (cuando corresponda)

| Archivo | Propósito |
|---------|-----------|
| `docs/EDD/EDD-009-virtual-device-state-model.md` | Modelo de estado |
| Estado interno + políticas en el Virtual Device | Implementación (FASE 2 del simulador) |

### Dependencias

| Dependencia | Tipo | Afecta |
|-------------|------|--------|
| ISSUE-031 FASE 1 (Protocol Simulator) | Implementación | Base del Virtual Device |
| FASE 0.5 (Protocol Conformance) | Implementación | Validadores contra los que se testea el estado |
| ADR-026 | Contractual | Unidades temporales del estado |
| DDD-008 | Conceptual | Política tridimensional en el reporting |

### Validaciones (cuando corresponda)

| Tipo | Descripción |
|------|-------------|
| Contract tests | Todo mensaje del Stateful Device pasa los validadores de conformance |
| Determinism test | Misma config + mismos comandos → misma secuencia |
| Command effect test | Comando muta estado del actuador y el ACK lo refleja |
| Reporting test | `status`/`telemetry`/`health` reportan lo definido por la política |

---

## FASE 7 — Consistency Audit

| Documento | Consistencia |
|-----------|--------------|
| ISSUE-031 | Consistente — FASE 2 es la etapa siguiente del roadmap |
| ADR-026 | Consistente — segundos Unix; reloj real (Virtual Time es FASE 6) |
| ADR-030 | Consistente — comandos y ACK canónicos mutan el estado |
| DDD-008 | Referencia — estado tridimensional sin cerrar decisiones |
| mqtt-contract.md | Consistente — sin cambios de topics/payloads |
| FASE 3/4/5 roadmap | Sin conflicto — exclusiones explícitas |

**Conflictos aceptados temporalmente:**

| Conflicto | Decisión temporal |
|-----------|-------------------|
| DDD-008 en Borrador | Se usa como referencia conceptual; su promoción futura debe evaluar impacto |

---

## FASE 8 — Regression Risk Audit

### Áreas protegidas

| Área | Protección |
|------|------------|
| Superficie de mensajes de FASE 1 | Contract tests de conformance obligatorios |
| Contrato MQTT | Sin cambios de topics ni payloads |
| Backend / firmware | Sin modificaciones |

### Nuevas pruebas requeridas

- Determinism test (configuración fija → secuencia idéntica).
- Conformance test (mensajes con estado vs validadores FASE 0.5).
- Command→state→ACK test.
- Reporting policy test.

---

## Reglas generales aplicadas

- Hereda los 8 principios rectores del ISSUE-031.
- No implementar antes de comprender: este ISSUE es de diseño.
- No romper contratos existentes.
- Separar arquitectura de implementación: la implementación será ISSUE(s) separado(s) tras la aprobación del diseño y la congelación del contrato.
- Fidelidad incremental: FASE 2 no anticipa FASE 3.
