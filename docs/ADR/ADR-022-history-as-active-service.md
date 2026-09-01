# ADR-022: History as Active Service

**Fecha**: 2026-07-20
**Estado**: ~~Aceptado~~ → **SUPERSEDED** (DECISION-003, 2026-08-07)

> **Actualización 2026-08-15 (PR-I / DECISION-003):** este ADR queda **SUPERSEDED** y
> el `HistoryService` se declara **"reservado"** (sin implementación ni consumidores;
> `getRunTimeline`/`getRunSummary` no se implementaron). El acceso a historial se sirve
> hoy vía `backend/src/routes/analytics.js` (con `CultivationCycle` + `CycleState`).
> El ADR asumía la entidad `Run`, que no existe (ver ADR-020). La funcionalidad queda
> reservada para una evolución futura (p. ej. si se adopta `Run`). No hay contrato de
> comunicación afectado: el servicio nunca se expuso.

## Context

In the previous implementation, history data was distributed across 8+ tables (telemetry, cycle_states, phase_transitions, alarms, events, device_health, audit_logs, etc.) with no unified query mechanism. There was no way to ask "what happened during this run?" without querying multiple endpoints and assembling the result in the frontend.

## Decision

The refounded system introduces an active **HistoryService** that reconstructs the complete timeline of a Run from three sources:

1. **RunState** — snapshots created every Control Engine evaluation cycle (reads, deviations, commands)
2. **PhaseTransition** — records of every phase change with trigger data
3. **Alarm** — alarm events with their resolution lifecycle

HistoryService exposes methods like:
- `getRunTimeline(runId)` → chronological list of states + transitions + alarms
- `getRunSummary(runId)` → aggregate metrics (total alarms, phase durations, average readings)

## Consequences

- Positive: The frontend gets a unified history view with a single query.
- Positive: HistoryService encapsulates the query logic behind a clean interface.
- Negative: An additional service to maintain, but with clear responsibility.
