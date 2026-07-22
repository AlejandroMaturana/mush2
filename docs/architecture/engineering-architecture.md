# MUSH2 — Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                              │
│  Dashboards · Run Detail · Alarm View · Auth Screens     │
└────────────────────────┬────────────────────────────────┘
                         │ UserAuth + CrudApi + StateStream
┌────────────────────────▼────────────────────────────────┐
│                    BACKEND                                │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   Auth       │  │  REST API   │  │  Event Stream    │  │
│  └──────┬───────┘  └──────┬──────┘  └──────────────────┘  │
│         │                 │                                │
│  ┌──────▼─────────────────▼──────────────────────────┐   │
│  │              APPLICATION SERVICES                   │   │
│  │  ChamberService · RecipeService · RunService        │   │
│  │  TelemetryService · AlarmService · HistoryService   │   │
│  └──────┬─────────────────┬──────────────────────────┘   │
│         │                 │                               │
│  ┌──────▼─────────────────▼──────────────────────────┐   │
│  │              CONTROL ENGINE                         │   │
│  │  Orchestrator                                       │   │
│  │  ├── PhaseEvaluator                                 │   │
│  │  ├── ActuatorComputer                               │   │
│  │  ├── AlarmService (used by both CE and API)         │   │
│  │  └── SafetyGuard                                    │   │
│  └──────┬─────────────────────────────────────────────┘   │
│         │                                                 │
│  ┌──────▼─────────────────────────────────────────────┐   │
│  │              PERSISTENCE                             │   │
│  │  Repository implementations for all aggregates      │   │
│  │  users · chambers · recipes · runs · telemetry       │   │
│  │  alarms · run_states · phase_transitions · sessions  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │ TelemetryIngest + CommandDispatch
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     FIRMWARE                              │
│  ESP32-S3: sensor reading, actuator control, MQTT        │
└─────────────────────────────────────────────────────────┘
```

## Module (Package) Structure

```
packages/
  @mush2/
    domain/          — Pure types, value objects, domain services, enums
    application/     — Use cases (orchestrates domain with repositories)
    control-engine/  — Control loop: PhaseEvaluator, ActuatorComputer, SafetyGuard

apps/
  backend/           — Server assembly: persistence impl, API routes, MQTT bridge, scheduler
  frontend/          — SPA: pages, components, state management

firmware/            — ESP32-S3 C++ code: sensor reader, actuator controller, MQTT client
```

## Communication Contracts

| Contract | Source | Destination | Semantics |
|----------|--------|-------------|-----------|
| TelemetryIngest | Firmware | Backend | One-way, best-effort, batch of sensor readings |
| CommandDispatch | Backend | Firmware | One-way, at-least-once, list of actuator commands |
| StateStream | Backend | Frontend | Persistent connection, event-driven push |
| UserAuth | Frontend | Backend | Request-response, token-based |
| CrudApi | Frontend | Backend | Request-response, resource-oriented |

See `CONTRACTS.md` for full contract specifications.

## Layer Responsibilities

| Layer | Owns | Depends On |
|-------|------|------------|
| **Domain** | Entity definitions, value objects, enums, domain events, repository interfaces | Nothing |
| **Application** | Use cases (service orchestration), input validation, event publishing | Domain |
| **Control Engine** | Evaluation loop, phase transitions, actuator computation, fail-safe | Domain |
| **Persistence** | Database models, repository implementations, migrations | Domain (interfaces) |
| **API** | HTTP routes, request parsing, response serialization, auth middleware | Application + Domain |
| **Backend** | Server bootstrap, middleware stack, scheduler, MQTT bridge | All above |
| **Frontend** | UI components, pages, state management, API client | API (contract only) |
| **Firmware** | Sensor reading, actuator control, network communication | API (contract only) |
