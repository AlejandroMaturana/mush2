# ADR-021: Control Engine as Orchestrator

**Fecha**: 2026-07-20
**Estado**: Aceptado

> **Actualización 2026-08-15 (PR-J / ISSUE-087):** alineación con la implementación real.
> El orquestador es `backend/src/services/controlEngine.js` (evaluado cada 60 s, persistencia de evaluación en `CycleState` — ver ADR-020, no `RunState`). De los sub-servicios propuestos, solo **PhaseEvaluator** existe como módulo independiente (`backend/src/services/phaseEvaluator.js`, `evaluatePhaseTransition`/`executePhaseTransition`). La computación de actuadores por histéresis (`computeActuatorCommands`), las alarmas (`ensureAlarm`/`resolveAlarm`) y el fail-safe (`TEMP_CRITICAL`/`TEMP_RECOVERY` desde `SystemSetting`) están integrados en el orquestador. La decisión de orquestación se mantiene; la descomposición en `ActuatorComputer`/`AlarmService`/`SafetyGuard` queda documentada aquí como diseño objetivo, no como estado actual. Sin cambio de contrato.

## Context

In the previous implementation, controlEngine.js (483 lines) mixed cycle evaluation, actuator command computation, alarm generation/resolution, phase transitions, and fail-safe logic in a single file. This made the engine hard to reason about, test, and modify.

## Decision

The Control Engine remains a single entry point (orchestrator) but delegates specialized responsibilities to smaller, focused sub-services:

```
ControlEngine (orchestrator — every 60s)
├── PhaseEvaluator (transition rules per species)
├── ActuatorComputer (hysteresis-based command calculation)
├── AlarmService (deduplication, generation, resolution)
└── SafetyGuard (fail-safe: temp > 32°C)
```

The orchestrator is responsible for:
- Fetching active runs
- Iterating through each run
- Calling sub-services in order
- Persisting the evaluation result (RunState)
- Emitting events (commands to firmware, state to frontend)

## Consequences

- Positive: Each sub-service can be tested independently.
- Positive: The orchestrator is a thin coordinator — easy to reason about.
- Negative: Slightly more indirection than a single procedural file.
