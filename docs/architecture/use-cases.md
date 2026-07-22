# Use Cases — MUSH2 MVP

## Legend

| Abbreviation | Meaning |
|---|---|
| UC | Use Case |
| Pre | Precondition |
| Post | Postcondition |
| Alt | Alternative flow |
| Err | Error flow |

---

## Identity Context

### UC-01: Register User

| Aspect | Description |
|---|---|
| **Actor** | Unregistered operator |
| **Trigger** | Operator fills registration form |
| **Pre** | None |
| **Post** | User created, UserRegistered event published |
| **Main flow** | 1. Validate username (3–32 chars, alphanumeric) 2. Validate email format 3. Hash password 4. Persist User 5. Publish UserRegistered |
| **Alt** | — |
| **Err** | Username already taken → 409 Conflict. Email already in use → 409 Conflict. Invalid format → 400 Bad Request |

### UC-02: Login

| Aspect | Description |
|---|---|
| **Actor** | Registered operator |
| **Trigger** | Operator submits credentials |
| **Pre** | User exists |
| **Post** | Session token returned |
| **Main flow** | 1. Find user by email or username 2. Compare password hash 3. Generate session token 4. Return token |
| **Alt** | — |
| **Err** | User not found → 401 Unauthorized. Password mismatch → 401 Unauthorized |

### UC-03: Validate Session

| Aspect | Description |
|---|---|
| **Actor** | System (internal) |
| **Trigger** | Incoming request with token |
| **Pre** | Token provided |
| **Post** | userId extracted |
| **Main flow** | 1. Decode token 2. Verify signature 3. Check expiration 4. Return userId |
| **Err** | Invalid token → 401. Expired → 401 |

---

## Cultivation Context

### UC-04: Create Chamber

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator fills chamber form |
| **Pre** | User is authenticated |
| **Post** | Chamber created, ChamberCreated event published |
| **Main flow** | 1. Validate name (1–64 chars) 2. Validate externalDeviceId (unique per user) 3. Persist Chamber 4. Publish ChamberCreated |
| **Err** | Device ID already registered → 409 Conflict |

### UC-05: List Chambers

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator navigates to chambers view |
| **Pre** | User is authenticated |
| **Post** | List of chambers returned (with active run status) |
| **Main flow** | 1. Find all chambers by userId 2. Enrich each chamber with active run status 3. Return list |

### UC-06: Create Recipe

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator fills recipe form |
| **Pre** | User is authenticated |
| **Post** | Recipe created, RecipeCreated event published |
| **Main flow** | 1. Validate name (1–64 chars, unique per user) 2. Validate at least one phase defined 3. Validate phase ordering (INCUBATION < FRUCTIFICATION < HARVEST) 4. Validate targets (min ≤ max for all metrics) 5. Persist Recipe 6. Publish RecipeCreated |
| **Err** | Name already exists → 409 Conflict. Invalid phases → 400 Bad Request |

### UC-07: List Recipes

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator navigates to recipes view |
| **Pre** | User is authenticated |
| **Post** | List of recipes returned |
| **Main flow** | 1. Find all recipes by userId 2. Return list |

### UC-08: Schedule Run

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator selects chamber + recipe to start |
| **Pre** | User is authenticated. Chamber exists and belongs to user. Recipe exists and belongs to user. |
| **Post** | Run created with status SCHEDULED. RunScheduled event published. |
| **Main flow** | 1. Validate chamber belongs to user 2. Validate recipe belongs to user 3. Create Run with status SCHEDULED, currentPhase = recipe's first phase 4. Persist Run 5. Publish RunScheduled |
| **Err** | Chamber not found → 404. Recipe not found → 404. Run already ACTIVE for chamber → 409 Conflict |

### UC-09: Activate Run

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator confirms activation |
| **Pre** | Run exists, status = SCHEDULED. Chamber has no other ACTIVE run. |
| **Post** | Run status → ACTIVE. startDate set. RunStarted event published. |
| **Main flow** | 1. Find Run 2. Validate status == SCHEDULED 3. Validate no other ACTIVE run on same chamber 4. Set status = ACTIVE, startDate = now 5. Persist 6. Publish RunStarted |
| **Err** | Run not found → 404. Wrong status → 409 Conflict. Another ACTIVE run → 409 Conflict |

### UC-10: Abort Run

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator (or System via fail-safe) |
| **Trigger** | Operator clicks abort, or ControlEngine detects fail-safe condition |
| **Pre** | Run exists, status = ACTIVE |
| **Post** | Run status → ABORTED. endDate set. RunAborted event published. |
| **Main flow** | 1. Find Run 2. Validate status == ACTIVE 3. Set status = ABORTED, endDate = now 4. Persist 5. Publish RunAborted |
| **Err** | Run not found → 404. Wrong status → 409 Conflict |

---

## Monitoring Context

### UC-11: Ingest Telemetry

| Aspect | Description |
|---|---|
| **Actor** | Firmware (via bridge) |
| **Trigger** | Firmware sends sensor readings (every 30s) |
| **Pre** | Chamber exists. Firmware is authenticated (by deviceId). |
| **Post** | Telemetry persisted. TelemetryReceived event published. |
| **Main flow** | 1. Validate chamber exists 2. Validate sensorType 3. Validate value within physical range 4. Persist Telemetry 5. Publish TelemetryReceived |
| **Err** | Chamber not found → skip reading. Invalid value → skip reading |

### UC-12: Acknowledge Alarm

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator views active alarm and acknowledges it |
| **Pre** | Alarm exists, status = ACTIVE |
| **Post** | Alarm status → ACKNOWLEDGED. acknowledgedAt set. AlarmAcknowledged event published. |
| **Main flow** | 1. Find Alarm 2. Validate status == ACTIVE 3. Set acknowledgedAt, acknowledgedBy 4. Persist 5. Publish AlarmAcknowledged |
| **Err** | Alarm not found → 404. Already acknowledged or resolved → 409 Conflict |

### UC-13: View Active Alarms

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator opens alarms view |
| **Pre** | User is authenticated |
| **Post** | List of non-resolved alarms for user's chambers returned |
| **Main flow** | 1. Find all chambers by userId 2. Find all non-resolved alarms for those chambers 3. Return list |

---

## History Context

### UC-14: View Run Timeline

| Aspect | Description |
|---|---|
| **Actor** | Authenticated operator |
| **Trigger** | Operator opens run detail view |
| **Pre** | Run exists and belongs to user. |
| **Post** | Timeline of evaluation snapshots + phase transitions returned |
| **Main flow** | 1. Validate Run belongs to user 2. Fetch RunState snapshots (ordered by evaluatedAt) 3. Fetch PhaseTransition records 4. Merge into chronological timeline 5. Return |

---

## Control Context

### UC-15: Execute Control Cycle

| Aspect | Description |
|---|---|
| **Actor** | System (scheduler, every 60s) |
| **Trigger** | Timer fires |
| **Pre** | At least one Run with status ACTIVE exists |
| **Post** | Each active run evaluated. Actuator commands computed. Alarms generated/resolved. History snapshots persisted. |
| **Main flow** | 1. Find all ACTIVE runs 2. For each run: a. Load latest telemetry for the chamber b. Retrieve recipe phase targets c. Evaluate temperature, humidity, CO2, VOC against targets d. Compute VPD e. Compute actuator commands (heater, humidifier, fan, lights) f. Check fail-safe thresholds g. Generate alarms if out of range h. Self-resolve alarms if back in range i. Check phase duration — auto-transition if elapsed j. Persist RunState snapshot k. Publish events |
| **Alt** | If fail-safe triggered (temp > 32°C): abort run, generate CRITICAL alarm, force all actuators OFF |

---

## State Stream (Cross-cutting)

### UC-16: Receive Real-time Updates

| Aspect | Description |
|---|---|
| **Actor** | Frontend |
| **Trigger** | Frontend opens chamber detail or dashboard view |
| **Pre** | User is authenticated |
| **Post** | Frontend receives push updates for: telemetry, alarm changes, run status changes |
| **Main flow** | 1. Frontend establishes connection 2. Backend subscribes frontend to relevant events 3. On each event, backend pushes payload to frontend |
| **Note** | The connection mechanism is an implementation detail (SSE, WebSocket, etc.). The contract is simply: "events are pushed to connected clients." |
