# ISSUE-031: Simulation Platform

**Estado:** Proposed

**Fecha:** 2026-07-30

**Autores:** Equipo Mush2

**Documentos relacionados:**
- `AUDIT-001-simulation-platform.md` — Auditoría técnica (evidencia archivo:línea)
- `simulation-platform-roadmap.md` — Roadmap FASE 0-9 (referencia)
- `ISSUE-030-command-actuation-protocol.md` — Command & Actuation Protocol (gate FASE 3.5)

---

## Contexto

Mush2 es un ecosistema monorepo (pnpm) compuesto por `frontend`, `backend`, `firmware` y `docs`. El firmware (ESP32-S3) publica telemetría y estado por MQTT hacia el broker Mosquitto; el backend suscribe, persiste y emite eventos por SSE; el frontend consume esos eventos. El contrato MQTT oficial reside en `docs/contracts/mqtt-contract.md`.

La capa de comandos (backend → firmware) está gobernada por `ISSUE-030-command-actuation-protocol.md` y su materialización normativa (`ADR-030`, `RFC-0009`).

La validación actual del ecosistema depende de hardware físico: no existe un mecanismo reproducible para ejercitar contratos, integración y comportamiento sin dispositivos reales.

## Misión de la Simulation Platform

> La Simulation Platform constituye la **infraestructura oficial de validación del ecosistema Mush2**.

Su propósito **no** es reemplazar el firmware ni al backend. Su propósito es validar contratos, integración y comportamiento del sistema de forma **reproducible** y **desacoplada del hardware físico**, siendo el componente de prueba canónico que cualquier fase futura del ecosistema debe contemplar.

## Problema

1. **Contract drift latente:** coexisten múltiples interpretaciones del wire protocol (estructuras de topics divergentes, formatos de comando y ACK en disputa), lo que genera riesgo de perpetuarse en cualquier nuevo consumidor del broker.
2. **Sin validación reproducible:** la verificación de la vertical slice es manual y dependiente de hardware; no hay forma automatizada de detectar regresiones de integración.
3. **Comandos sin canal validado:** la ruta backend → firmware presenta un formato de comando que no coincide con el parser real del dispositivo, y el ACK no está implementado en firmware.
4. **Fuentes de verdad no congeladas:** payloads documentados en guías de desarrollo difieren de los publicados por firmware, de modo que cualquier herramienta derivada de esas guías hereda el error.

## Motivación

- Reducir el costo de validación eliminando la dependencia de hardware físico.
- Congelar el contrato antes de construir consumidores adicionales.
- Habilitar CI con pruebas de integración reales sobre el broker.
- Establecer una plataforma de validación que evolucione en fases sin reescribir sus cimientos.

## Objetivos

1. Producir una entidad **Virtual Device** capaz de comportarse como un dispositivo Mush2 conforme al contrato oficial.
2. Ejercitar la vertical slice completa: registro → autenticación MQTT → telemetría/estado → persistencia → eventos SSE → comandos → ACK.
3. Validar la integración backend y firmware contra un contrato **congelado** mediante artefactos de conformance.
4. Aislar completamente el ambiente de simulación del ambiente real.
5. Servir de cimiento para fases posteriores (escenarios, multi-dispositivo, tiempo virtual, CI).

## Objetivos No Funcionales

Las decisiones de cada fase deben preservar:

- **Reproducibilidad:** la misma configuración de simulación produce la misma secuencia observable de eventos.
- **Determinismo:** el comportamiento simulado es determinista dado un escenario y una semilla.
- **Escalabilidad:** capacidad de agregar dispositivos y escenarios sin cambios estructurales.
- **Configurabilidad:** comportamiento parametrizable sin tocar código.
- **Extensibilidad:** nuevas fidelidades se agregan por extensión, no por modificación.
- **Observabilidad:** todo evento simulado es inspeccionable (traza, log, métrica).
- **Aislamiento entre ambientes:** separación estricta DEV vs. PROD a nivel de topics, credenciales y ACL.

## Principios Rectores de la Simulation Platform

Restricciones arquitectónicas permanentes que gobiernan todas las fases:

1. **Contract First:** ningún artefacto se construye antes de que el contrato de mensajes esté congelado y verificado. El contrato es la especificación, no la implementación.
2. **Hardware Independent:** el simulador modela el comportamiento del dispositivo conforme al contrato; nunca depende de plataformas o drivers específicos del firmware.
3. **Deterministic Simulation:** ante la misma entrada y configuración, la salida observable es idéntica. Prohibida toda fuente de no-determinismo no controlada (reloj real, aleatoriedad sin semilla).
4. **Environment First:** toda simulación se ejecuta en un ambiente aislado e identificable; el entorno simulado nunca puede contaminar al productivo.
5. **Single Source of Truth:** el contrato compartido es la única fuente de verdad del wire. Backend, firmware y simulador dependen del contrato, **nunca unos de otros**.
6. **Incremental Fidelity:** la plataforma aumenta fidelidad por fases; cada fase agrega comportamiento sin reescribir la anterior.
7. **Observable by Design:** la plataforma es transparente: todo estado, transición y mensaje es trazable.
8. **Non-invasive Integration:** la plataforma no exige cambios en backend ni firmware existentes para funcionar; se integra como un consumidor legítimo más del contrato.

### Refuerzo Contract First

- El simulador **nunca** debe convertirse en una segunda fuente de verdad.
- El simulador **no** replica lógica de negocio ni define comportamientos propios fuera del contrato oficial.
- Backend, firmware y simulador comparten un único contrato; cualquier divergencia se resuelve en el contrato, no en los consumidores.
- La arquitectura debe **impedir estructuralmente** que el simulador introduzca variantes de payload no contempladas en los artefactos de conformance.

## Alcance

Este ISSUE abarca las **FASE 0, FASE 0.5 y FASE 1** del roadmap de alto nivel (ver más abajo), es decir: la definición arquitectónica, la congelación del contrato mediante artefactos de conformance y el Protocol Simulator mínimo viable.

## Exclusiones

- No se modifica ningún contrato MQTT existente ni se crean topics nuevos.
- No se cierra ninguna decisión arquitectónica abierta (topic path, ACK, `cmdId`); solo se identifican como dependencias.
- No se implementa el firmware alternativo ni HAL en este ISSUE.
- No se implementan Scenario Engine, Virtual Time, Farm Simulation ni Digital Twin.
- No se define la estructura definitiva del repositorio.
- No se altera la gobernanza documental existente (ISSUE → DDD → ADR → RFC).

## Criterios de Aceptación

1. El contrato del wire está congelado mediante artefactos de conformance (schemas, ejemplos canónicos, validadores, contract tests) **antes** de escribir cualquier línea del simulador.
2. Un Virtual Device publica telemetría y estado con payloads que pasan los validadores de conformance del contrato.
3. Un Virtual Device responde a comandos del backend con el formato de ACK canónico definido en el contrato.
4. La telemetría simulada fluye por el pipeline estándar: broker → backend → persistencia → SSE.
5. El Virtual Device se registra mediante el flujo de identidad de dispositivo estándar del ecosistema.
6. No existe fuga de mensajes simulados hacia el ambiente productivo (verificado por ACL y naming).
7. Un mismo escenario ejecutado dos veces produce secuencias de eventos idénticas.
8. La documentación oficial (contrato, guía de desarrollo, roadmap) queda consistente sin referencias obsoletas.

## Dependencias

1. **ISSUE-030 / RFC-0009:** formato canónico de comando y ACK (gate FASE 3.5).
2. **ADR-030:** identidad y formato de `cmdId` (Aceptado).
3. **ADR-026:** contrato temporal (unidades en el wire).
4. **ADR-028:** identidad MQTT por dispositivo.
5. **ADR-029:** aislamiento de ambientes.
6. **DDD-008:** política de estado tridimensional (Borrador).
7. **mqtt-contract.md:** contrato MQTT vigente.
8. **Registro de dispositivos:** flujo actual a revisar como riesgo de ambiente.
9. **Docs de desarrollo:** guías de vertical slice con payloads divergentes del firmware (a corregir en FASE 0.5).
10. **Infraestructura CI:** pipelines sin broker para validación de integración.

## Riesgos

| # | Riesgo | Mitigación |
|---|--------|-----------|
| R1 | Contract drift perpetuado en el simulador | FASE 0.5 congela el contrato antes de escribir código |
| R2 | Simulador se convierte en segunda fuente de verdad | Principio Single Source of Truth + artefactos de conformance obligatorios |
| R3 | Falsa confianza: simulación "pasa" pero no refleja el protocolo real | Validadores derivados del contrato, no de la implementación |
| R4 | Duplicidad con lógica del backend | Prohibido replicar lógica de negocio; el simulador solo emite conforme al contrato |
| R5 | Acoplamiento a payloads erróneos documentados | FASE 0.5 corrige y congela ejemplos canónicos |
| R6 | Deriva del reloj simulado vs. contrato temporal | Determinismo + unidades del wire según ADR-026 |
| R7 | Scope creep hacia fases futuras | Alcance explícito: FASE 0 / 0.5 / 1 |
| R8 | Bloqueo por dependencia del gate de comandos | FASE 0.5 y FASE 1 son ejecutables en paralelo con el subconjunto del contrato ya decidido |

## Visión de Largo Plazo

Evolución gradual, sin implicar implementación de ninguna etapa:

1. **Protocol Simulator** — replicar la superficie de mensajes del dispositivo conforme al contrato.
2. **Stateful Device** — estado tridimensional (simulado, reportado, persistido) con políticas definidas.
3. **Environment Simulation** — modelo del entorno físico (temperatura, humedad, etc.) que alimenta al dispositivo virtual.
4. **Scenario Engine** — orquestación de eventos temporales y perturbaciones sobre el entorno.
5. **Farm Simulation** — múltiples dispositivos y granjas completas simuladas simultáneamente.
6. **Virtual Time** — control del reloj simulado y aceleración temporal.
7. **CI Validation Platform** — integración como fase de validación automatizada del ecosistema.
8. **Hardware Abstraction Layer** — puente hacia hardware real manteniendo el mismo contrato.
9. **Digital Twin** — réplica digital sincronizada de un sistema físico real.

Esta visión establece dirección arquitectónica; cada etapa debe materializarse como un ISSUE propio que herede estos principios.

## Roadmap de Alto Nivel

- **FASE 0 — Arquitectura y decisiones:** formalizar la posición de la plataforma en el ecosistema, el contrato compartido y los principios rectores.
- **FASE 0.5 — Protocol Conformance:** sin escribir código. Congelar el contrato mediante JSON Schema, ejemplos canónicos de payload, validadores y contract tests. Reducir el riesgo de perpetuar el Contract Drift.
- **FASE 1 — Protocol Simulator (MVP):** Virtual Device mínimo que publica telemetría/estado conforme al contrato y responde a comandos con ACK canónico.
- **FASE 2 — Stateful Device**
- **FASE 3 — Environment Model**
- **FASE 4 — Scenario Engine**
- **FASE 5 — Multi Device / Farm**
- **FASE 6 — Virtual Time**
- **FASE 7 — CI Validation Platform**
- **FASE 8 — Hardware Abstraction Layer**
- **FASE 9 — Digital Twin**

---

## FASE 1 — Principios de ejecución

### 1. Implementar contra contratos congelados, no contra código existente

La fuente de verdad es, en orden:

1. `RFC-0009-command-actuation-protocol.md` — Command Protocol
2. `docs/ADR/ADR-030-command-actuation-protocol.md` — decisión arquitectónica
3. `docs/EDD/EDD-006-mapeo-canales-actuadores.md` — mapeo canónico de canales
4. Schemas y contract tests de `docs/contracts/conformance/`

Toda divergencia encontrada en el código debe tratarse como **legacy drift**, nunca como oportunidad para adaptar el contrato.

### 2. FASE 1 es una vertical slice, no una modificación aislada

El objetivo **no** es tocar módulos en cadena (`controlEngine.js` → `mqttBridge.js` → modelo).

El objetivo es demostrar el flujo completo:

```
Control Engine
      ↓
Command Builder
      ↓
MQTT Publish
      ↓
Firmware Subscriber
      ↓
Actuator Execution
      ↓
ACK
      ↓
Backend State Update
      ↓
API Verification
```

Aunque inicialmente sea con un único actuador.

### 3. Capa explícita de Command Builder

`controlEngine.js` **no** debe seguir generando payloads directamente. El contrato (ADR-030) se materializa en una capa propia bajo `domain/commands/`:

```
domain/
 └── commands/
      ├── commandBuilder.js
      ├── commandSchema.js
      └── commandLifecycle.js
```

Responsabilidades:

- generar `cmdId`
- timestamp
- `source`
- normalizar actuadores
- validar contra el contrato
- preparar la publicación MQTT

Así ADR-030 no queda acoplado al motor de control.

### 4. El ACK entra desde el principio

No se pospone como "fase posterior". El error típico IoT es: *"publiqué MQTT, entonces ejecuté una orden"*.

Estados mínimos del ciclo de vida:

```
CREATED
   ↓
PUBLISHED
   ↓
DELIVERED
   ↓
EXECUTED
   ↓
CONFIRMED
```

El sistema debe distinguir: orden generada, orden enviada, dispositivo la recibió, actuador la ejecutó.

### 5. Tests de contrato antes que tests unitarios

Prioridad de pruebas:

```
Contract tests
      ↓
Integration tests
      ↓
Unit tests
```

El problema que resolvieron FASE 0 y FASE 0.5 fue precisamente el drift contractual; la primera línea de defensa son los contract tests.

### 6. No borrar compatibilidad todavía

Durante FASE 1, toda implementación nueva debe **convivir con la ruta antigua** hasta completar migración y validación:

```
legacy actuator mapping
        |
        | deprecated
        ↓

canonical actuator mapping
        |
        ↓
ADR-030
```

Nada de "limpiar" antes de demostrar estabilidad.

### 7. Criterio de salida de FASE 1

No es *"código implementado"*, sino:

> Un comando canónico puede viajar desde backend hasta firmware y regresar con ACK verificable.

Checklist:

- [ ] Backend genera `cmdId`
- [ ] Payload cumple schema ADR-030
- [ ] MQTT topic correcto
- [ ] Firmware acepta comando canónico
- [ ] Firmware responde ACK
- [ ] Backend registra ACK
- [ ] API expone estado actualizado
- [ ] Contract tests pasan
- [ ] No existen mappings contradictorios

---

## Reglas de gobernanza aplicadas

- La auditoría técnica (evidencia archivo:línea) vive en `AUDIT-001-simulation-platform.md`; este ISSUE solo contiene conclusiones arquitectónicas.
- Ninguna fase se implementa antes de que el contrato correspondiente esté congelado (FASE 0.5).
- Cada fase futura (FASE 2+) debe materializarse como ISSUE propio que herede estos principios.
- No se modifican contratos ni se crean topics nuevos sin pasar por el framework de gobernanza (ISSUE → DDD → ADR → EDD/RFC).
