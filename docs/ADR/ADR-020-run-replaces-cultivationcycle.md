# ADR-020: Run Replaces CultivationCycle

**Fecha**: 2026-07-20
**Estado**: ~~Aceptado~~ → **SUPERSEDED** (DECISION-002, 2026-08-07)

> **Actualización 2026-08-15 (PR-I / DECISION-002):** este ADR queda **SUPERSEDED**.
> La refundación prevista (tabla `runs` en sustitución de `cultivation_cycles`) no se
> completó: **CultivationCycle es el modelo vigente**. Persiste
> `backend/src/models/CultivationCycle.js`, las rutas activas son `/cycles*`
> (`backend/src/routes/cycles.js`; `actuators.js:40`, `analytics.js:74` consultan
> `CultivationCycle`) y `api-contract.md` documenta `/cycles*` (no `/runs`).
> No hay cambio de contrato de comunicación: `/cycles*` se mantiene.

## Context

The previous codebase used "CultivationCycle" as the central domain entity. The term is verbose, technically imprecise in common mushroom cultivation parlance, and creates unnecessarily long identifiers across models, tables, and API paths.

## Decision

The refounded system uses **Run** as the central execution entity. A Run is an active cultivation instance that binds a Chamber and a Recipe through time.

## Consequences

- Positive: Shorter, clearer identifier across code, API, and database.
- Positive: Eliminates confusion between Cycle (the domain entity) and CycleState (the history snapshot).
- Negative: Database migration or rename needed to carry this forward. In practice, since we are rebuilding, there is no migration — the new `runs` table replaces `cultivation_cycles`.
