# MUSH2 — MVP Definition

## Scope

The MVP consists of exactly the following capabilities, mapped to the core flow:

| # | Capability | Flow Step | Justification |
|---|------------|-----------|---------------|
| 1 | User registration and login | User | Without identity, no one owns the runs |
| 2 | Create and list chambers | Chamber | Physical space where cultivation happens |
| 3 | Create and list recipes | Recipe | Defines environmental targets per species/phase |
| 4 | Start, activate, abort runs | Run | The central execution entity |
| 5 | Ingest and query telemetry | Telemetry | Sensor readings are the system's sensory input |
| 6 | Evaluate runs every 60s | Control Engine | The brain that decides what to do |
| 7 | Compute actuator commands | Control Engine | Converts decisions into hardware actions |
| 8 | Generate and resolve alarms | Alarm | Notifies the user of abnormal conditions |
| 9 | Persist run states and transitions | History | Every evaluation is recorded for audit/review |

## Out of Scope (Documented, Not Implemented)

| Feature | Reason |
|---------|--------|
| Species profiles as entities | Species knowledge is encoded in transition rules |
| Device/Sensor/Actuator as separate models | Simplified: Chamber carries deviceId, telemetry carries readings |
| Subscriptions / API keys | No multi-tenancy in MVP |
| General audit log (all actions) | Each domain entity self-records its own history |
| Bioactive profiles | Lab analysis, outside MVP flow |
| RBAC roles | Single user, roles added later |
| ThingSpeak sync | External dependency, outside MVP |
| OTA firmware management | Firmware features deferred to post-MVP |
| Multi-chart analytics | Basic dashboard is sufficient MVP |
| Recipe cloning | Nice-to-have, not essential for first run |
| Phase transition approval workflow | MVP uses FULL_AUTO only |

## Quality Attributes

| Attribute | Target |
|-----------|--------|
| Control cycle latency | < 60s (configurable) |
| Telemetry ingestion | At least 1 reading per 30s per chamber |
| Alarm deduplication | Exactly 1 active alarm per (chamber, type, sensor) |
| API response time | < 200ms (p95) for read endpoints |
| Frontend load time | < 3s initial, < 500ms subsequent |
