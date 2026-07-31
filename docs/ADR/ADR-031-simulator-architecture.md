# ADR-031: Simulator Architecture

**Estado:** Aceptado

**Fecha:** 2026-07-30

**Autores:** Equipo Mush2

**Decisores:** Equipo Mush2

**Documentos relacionados:**
- `RFC-0010-simulation-platform.md` — Propuesta (DRAFT)
- `ISSUE-031-simulation-platform.md` — ISSUE Rector

---

# Resumen

Se adopta la **Simulation Platform** como la infraestructura oficial de validación del ecosistema Mush2. Se decide que la plataforma es un cliente legítimo del contrato MQTT (no un reemplazo del firmware ni del backend), que evoluciona por fases con fidelidad incremental, y que el **contrato compartido** es la única fuente de verdad del wire. Los artefactos de conformance (schemas, ejemplos canónicos, validadores) generados en la FASE 0.5 del ISSUE-031 pasan a ser la referencia normativa para cualquier consumidor del broker.

# Contexto

La auditoría (AUDIT-001) evidencia contract drift entre contrato documentado, backend y firmware (H-01 a H-08). La validación del sistema depende de hardware físico y no existe una forma reproducible de ejercitar la vertical slice. El ecosistema necesita una plataforma de validación desacoplada del hardware que, además, no perpetúe el drift.

# Decisión

## 1. Simulation Platform como infraestructura oficial de validación

- La plataforma valida contratos, integración y comportamiento de forma reproducible y desacoplada del hardware.
- **No** reemplaza al firmware ni al backend. Es un consumidor oficial del contrato.
- Todo dispositivo simulado se registra y autentica como un dispositivo Mush2 estándar.

## 2. Contract First y Single Source of Truth

- El contrato del wire es la única fuente de verdad; vive en los artefactos de conformance (`docs/contracts/conformance/`).
- Backend, firmware y simulador dependen del contrato, **nunca unos de otros**.
- El simulador **no** replica lógica de negocio ni define comportamientos fuera del contrato.
- Los artefactos de conformance serán la base de un paquete compartido (`packages/protocol`) en fases posteriores.

## 3. Principios rectores obligatorios

Contract First, Hardware Independent, Deterministic Simulation, Environment First, Single Source of Truth, Incremental Fidelity, Observable by Design, Non-invasive Integration (definidos en ISSUE-031). Toda fase futura debe respetarlos.

## 4. Evolución por fases

La plataforma evoluciona por fases (ISSUE-031): Protocol Simulator → Stateful Device → Environment Model → Scenario Engine → Farm → Virtual Time → CI → HAL → Digital Twin. Cada fase es un ISSUE propio que hereda estos principios.

## 5. Aislamiento de ambientes

Los dispositivos simulados operan solo en el ambiente DEV aislado (ADR-029). No existe fuga hacia PROD (verificado por ACL y naming).

# Justificación

| Problema | Resuelto por |
|----------|--------------|
| Validación dependiente de hardware | Virtual Device conforme al contrato |
| Contract drift perpetuado | Contrato congelado + Single Source of Truth |
| Falsa confianza en validación | Validadores derivados del contrato, no de la implementación |
| Duplicidad de lógica | Prohibición estructural de replicar lógica de negocio |

# Consecuencias

## Positivas

- Validación reproducible y determinista sin hardware.
- Contrato congelado accesible a todos los consumidores.
- Cimiento estable para CI, escenarios y multi-dispositivo.

## Negativas

- La FASE 1 requiere que los artefactos de conformance estén completos antes de codificar el simulador.
- El contrato congelado expone divergencias del backend/firmware actuales que deberán resolverse en ISSUEs futuros (H-02, H-03, H-04).

## Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| El simulador replica lógica del backend | Media | Alto | Límites explícitos + revisión en cada fase |
| Los schemas congelan un wire que el firmware no produce | Media | Medio | Schemas basados en el contrato documentado; divergencias documentadas como gaps conocidos |
| Fases posteriores violan los principios | Baja | Medio | ADR vinculante; cada fase declara su consistencia |

# ADR relacionados

- ADR-025 — Device Status Policy (dimensión de estado del Virtual Device)
- ADR-026 — Temporal Contract (unidades del wire)
- ADR-028 — Per-Device MQTT Identity (registro del simulador)
- ADR-029 — Environment Isolation (ambiente DEV)
- ADR-030 — Command & Actuation Protocol (comandos/ACK que el simulador ejercita)

# RFC relacionados

- RFC-0010 — Simulation Platform (propuesta que respalda este ADR)

# Historial

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-07-30 | Creación |
