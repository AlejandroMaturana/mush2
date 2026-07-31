# RFC-0010: Simulation Platform

**Estado:** DRAFT

**Fecha:** 2026-07-30

**Autores:** Equipo Mush2

**Área:** Backend / Firmware / Protocolo / CI

**Documentos relacionados:**
- `docs/contracts/conformance/README.md` — Artefactos de conformance (FASE 0.5)

---

## 1. Resumen

Este RFC propone la **Simulation Platform** como la infraestructura oficial de validación del ecosistema Mush2: una aplicación `simulator` capaz de comportarse como un dispositivo ESP32 ante el backend, ejecutándose sin hardware físico, conforme al contrato MQTT oficial.

La plataforma evoluciona por fases (ISSUE-031, `simulation-platform-roadmap.md`) desde un Protocol Simulator mínimo hasta un Digital Twin, pero la **decisión estructural** que este RFC propone desde la FASE 0 es: **un paquete de protocolo compartido (`packages/protocol`) como única fuente de verdad del contrato**, consumido por backend y simulador, para eliminar el *contract drift* identificado en la auditoría.

## 2. Contexto

- No existe infraestructura reproducible de validación: la vertical slice se verifica a mano con hardware real (`DEV_ENVIRONMENT.md`).
- El monorepo (`pnpm-workspace.yaml`) tiene 4 paquetes (`frontend`, `backend`, `firmware`, `docs`) y no incluye aún `packages/` ni `apps/`.

## 3. Problema

1. **Contract drift**: coexisten múltiples formas del mismo mensaje (H-01 topics, H-02 comando, H-03 ACK, H-04 QoS, H-05 payloads en guías).
2. **Validación no reproducible**: sin hardware no hay forma automatizada de probar integración, y los tests MQTT actuales son estáticos (H-06).
3. **Sin contrato congelado**: no existen schemas ni validadores que sirvan de referencia canónica para nuevos consumidores.

## 4. Propuesta

### 4.1 Componentes

| Componente | Rol |
|------------|-----|
| **Virtual Device** | Entidad simulada que habla el contrato MQTT como un ESP32 |
| **Shared Protocol Package (`packages/protocol`)** | Contrato compartido: tipos, schemas, validadores |
| **Simulation Engine** (fases posteriores) | Escenarios, ambiente, multi-dispositivo, tiempo virtual |
| **CI Validation** (FASE 7) | Validación automática en cada PR sobre el broker |

### 4.2 Contrato compartido

- `packages/protocol` contiene: JSON Schemas del wire, ejemplos canónicos, validadores y tipos.
- Backend, firmware (vía generación en build) y simulador **dependen del contrato, nunca unos de otros**.
- El simulador **nunca** es fuente de verdad ni replica lógica de negocio del backend.
- La congelación del contrato ocurre en la FASE 0.5 (Protocol Conformance) con los artefactos de `docs/contracts/conformance/`, que serán la base del paquete.

### 4.3 Límites

| Límite | Regla |
|--------|-------|
| Con el backend | El simulador es un consumidor/cliente oficial del contrato; no invoca internos del backend |
| Con el firmware | El simulador replica la superficie de mensajes; no comparte drivers ni lógica de control |
| Con el dominio | El simulador no computa setpoints, recetas ni control (eso es dominio del backend/firmware real) |
| Con los ambientes | Todo device simulado vive en el ambiente DEV aislado (ADR-029) |

### 4.4 Principios rectores

Contract First, Hardware Independent, Deterministic Simulation, Environment First, Single Source of Truth, Incremental Fidelity, Observable by Design, Non-invasive Integration (definidos en ISSUE-031).

## 5. Alternativas consideradas

| Alternativa | Decisión |
|-------------|----------|
| A — App standalone con tipos duplicados | Descartada: perpetúa el drift |
| B — App + `packages/protocol` | **Adoptada en este RFC** |
| C — Módulo interno del backend | Descartada: acopla la simulación al backend |
| D — Port del firmware a Node | Descartada: duplica mantenimiento |
| E — Plataforma completa desde inicio | Descartada: viola Incremental Fidelity |

## 6. Impacto

| Componente | Impacto |
|------------|---------|
| `pnpm-workspace.yaml` | Agregar `packages/*` (cuando se cree el paquete, fase posterior) |
| Backend | Sin cambios en FASE 1; puede adoptar `packages/protocol` progresivamente |
| Firmware | Sin cambios; contrato compartido a futuro vía generación |
| CI | FASE 7: broker + simulador en pipeline |
| Docs | Contrato congelado en `docs/contracts/conformance/`; guías corregidas (H-05) |

## 7. Preguntas abiertas

- ¿Se migra el backend a `packages/protocol` en la misma FASE 1 o en una fase propia?
- ¿`packages/protocol` genera tipos para el firmware (C++) en build o se mantiene manual?
- ¿El simulador se publica como paquete `apps/simulator` o `packages/simulator`? (decisión posterior, no bloqueante)

## 8. Proceso

- Estado actual: DRAFT — período de comentarios 7-14 días.
- Si ACCEPTED → genera ADR (ver `ADR-031-simulator-architecture.md`) y habilita la FASE 1 del ISSUE-031.
- Este RFC no implementa código; define la arquitectura de la plataforma.
