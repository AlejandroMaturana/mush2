# Contrato API REST — Mush2 v1

> Base URL: `/api/v1`
> Formato: JSON
> Autenticación: JWT via header `Authorization: Bearer <token>`. Access token en memoria (1h); refresh token por cookie `refresh_token` httpOnly (7d). Ver `POST /auth/refresh` y `POST /auth/logout`.
> Denegación por defecto (ISSUE-002/004/005): sin credenciales válidas, toda ruta distinta de la whitelist anónima del firmware devuelve `401 { "error": "Autenticación requerida" }`. Whitelist anónima (solo firmware, ISSUE-001): `POST /devices/register` exige **sesión o token de aprovisionamiento de un solo uso** (header `X-Provision-Token`, ver §2) — la entrada en whitelist solo permite llegar al gate de la ruta, no acuñar anónimamente; `GET /actuators?deviceId=` es el polling legítimo del firmware.
> Propiedad de recursos (ISSUE-002/004/005): los endpoints de tenant filtran/deniegan por propietario y vía `UserChamberAccess`; mutaciones del catálogo de especies exigen rol `ADMIN`; `PATCH /actuators/:channel` y `/devices/:id/actuators/:channel` NO auto-crean el dispositivo (404 si no existe).

---

## 1. Autenticación

> DECISION-005 (ISSUE-017/029): el access token vive solo en memoria del cliente y el refresh token viaja únicamente por cookie `httpOnly` (`SameSite=Strict`, `Secure` en producción, `Path=/api/v1/auth`). El backend persiste el **hash SHA-256** del refresh (nunca en claro), rota en cada refresco y revoca durablemente en logout.

### `POST /auth/register`
```json
// Request
{ "username": "string", "email": "string", "password": "string" }
// Response 201
{ "token": { "accessToken": "jwt..." }, "user": { "id","username","email","role" } }
// Set-Cookie: refresh_token=<jti>; Path=/api/v1/auth; HttpOnly; SameSite=Strict; [Secure]
```

### `POST /auth/login`
```json
// Request
{ "username": "string", "password": "string" }
// Response 200
{ "token": { "accessToken": "jwt..." }, "user": { "id","username","email","role" } }
// Set-Cookie: refresh_token=<jti>; Path=/api/v1/auth; HttpOnly; SameSite=Strict; [Secure]
```

### `POST /auth/refresh`
```json
// Request
// Sin body: el refresh token se lee de la cookie httpOnly `refresh_token`.
// (Backward-compat: si no hay cookie, se acepta { "refreshToken": "string" }.)
// Response 200
{ "token": { "accessToken": "jwt..." } }
// Set-Cookie: refresh_token=<nuevo jti>; Path=/api/v1/auth; HttpOnly; SameSite=Strict; [Secure]
// (rotación: el token anterior queda revocado)
//
// Error 401
{ "code": "REFRESH_EXPIRED", "error": "Refresh token inválido o expirado" }
// (aplica a token inexistente, revocado, rotado/replay o expirado)
```

### `POST /auth/logout`
Requiere auth. Invalida **todos** los refresh tokens del usuario (revocación durable) y limpia la cookie `refresh_token`. No requiere body.

### `GET /auth/me`
Requiere auth. Devuelve usuario actual.

### `PATCH /auth/me`
Requiere auth. Actualiza perfil del usuario.

---

## 2. Dispositivos

### `GET /devices`
- Response 200: `{ data: [{ id, deviceId, macAddress, chamberName, status, lastSeen, firmwareVersion, userId }] }`

### `GET /devices/:id`
- Incluye actuadores asociados
- Response 200: Detalle del dispositivo con actuadores

### `POST /devices`
Requiere auth.
```json
{ "deviceId": "Mush_001", "macAddress": "AA:BB:CC:DD:EE:FF", "chamberName": "...", "chamberLocation": "..." }
```

### `POST /devices/register`
Registro de dispositivo desde el firmware. Requiere **sesión autenticada** o **token de aprovisionamiento de un solo uso** (ISSUE-001 / ADR-028, ver §23).

- Header opcional: `X-Provision-Token: musht_<raw>` (token emitido por el operador, ver §9.1). Es consumido atómicamente al registrar (`usesRemaining` decrementado); no es reutilizable.
- Sin sesión ni header → `401 { "error": "Autenticación requerida", "code": "AUTH_REQUIRED" }`.
- Token inválido → `401 { "code": "INVALID_TOKEN" }`; expirado → `401 { "code": "TOKEN_EXPIRED" }`; revocado → `401 { "code": "TOKEN_REVOKED" }`; agotado → `401 { "code": "TOKEN_EXHAUSTED" }`.
- Token vinculado a otro `deviceId` → `403 { "code": "TOKEN_DEVICE_MISMATCH" }`.
- Request:
```json
{ "deviceId": "Mush_001", "macAddress": "AA:BB:CC:DD:EE:FF", "chamberName": "...", "chamberLocation": "..." }
```
- Response `201`: crea el device y devuelve credenciales MQTT (`{ device, mqtt: { user, pass, host, port } }`); `mqtt.user` = `mush_<deviceId>`.
- Reintento con el mismo token: si el body no incluye `deviceId` o el flujo falla con 5xx, la cuota se reintegra (`refundProvisioningToken`). Si el registro ya fue acuñado, el dispositivo se devuelve idempotente.

### `POST /devices/:id/claim`
Requiere auth. Reclama un dispositivo para el usuario actual.

### `PATCH /devices/:id`
Requiere acceso al dispositivo.
```json
{ "chamberName": "...", "chamberLocation": "..." }
```

### `DELETE /devices/:id`
Requiere acceso al dispositivo. Elimina dispositivo y datos asociados (cascade).

### `GET /devices/:id/cycle`
Devuelve el ciclo activo asociado al dispositivo.

---

## 3. Telemetría

### `GET /devices/:id/telemetry`
- Query: `?sensorType=TEMPERATURE&from=ISO&to=ISO&limit=100`
- Response: `{ data: [{ value, sensorType, unit, timestamp }] }`

### `GET /devices/:id/telemetry/latest`
- Response: `{ temperature, humidity, co2, voc, aqi, temperature_unit, humidity_unit, ts }`

---

## 4. Salud del Dispositivo

### `GET /devices/:id/health`
- Query: `?from=ISO&to=ISO&limit=100`
- Response: `{ data: [{ uptime, freeHeap, rssi, bootTestPassed, bootTestFailReason, timestamp }] }`

### `GET /devices/:id/health/latest`
- Response: Último registro de salud del dispositivo

---

## 5. Control de Actuadores

### `GET /devices/:id/actuators`
- Response: `{ data: [{ id, channel, state, mode, lastSeen }] }`

### `PATCH /devices/:id/actuators/:channel`
Requiere acceso al dispositivo.
```json
{ "command": "ON"|"OFF" }
```
Envía comando al dispositivo vía MQTT. Override remoto por 5 minutos.

---

## 6. Mantenimiento

### `GET /devices/:id/maintenance`
- Query: `?component=string&from=ISO&to=ISO&limit=100`
- Response: `{ data: [{ id, deviceId, component, health, estimatedFailure, reason, timestamp }] }`

### `GET /devices/:id/maintenance/latest`
- Response: `{ data: [{ component, health, timestamp }] }` — último estado por componente

### `POST /devices/:id/maintenance`
Requiere acceso al dispositivo.
```json
{ "type": "CLEANING", "notes": "string", "health": 95 }
```
`type` mapea a `component`. `notes` mapea a `reason`.

---

## 7. Integraciones

### `GET /devices/:id/integrations`
- Response: credenciales de integración del dispositivo (sin exponer secretos)

---

## 8. Telegram

> **Nota interna (ISSUE-048):** el subsistema se dividió en `telegramConfigurationService.js`, `telegramBotService.js` y `telegramErrors.js`. Este contrato NO cambia: los endpoints, payloads y códigos de error documentados a continuación son idénticos a la versión previa.

### `POST /telegram/link`
Requiere auth. Vincula cuenta de Telegram al usuario.
```json
{ "chatId": "string" }
```

### `GET /telegram/link`
Requiere auth. Devuelve estado de vinculación.

### `POST /telegram/unlink`
Requiere auth. Desvincula cuenta de Telegram.

### `GET /telegram/device/:deviceId`
Requiere auth. Configuración Telegram de un dispositivo.

### `PATCH /telegram/device/:deviceId`
Requiere auth. Actualiza configuración Telegram de un dispositivo.

### `POST /telegram/configure`
Requiere rol ADMIN. Configura el bot de Telegram. Idempotente y libre de carrera (serializa init/reconfigure/stop).
```json
// Request
{ "token": "string", "username": "string" }
// Response 200
{ "data": {
    "configured": true,
    "state": "disabled|starting|ready|degraded|stopped|failed",
    "running": "boolean",
    "username": "string",
    "lastError": "string|null",
    "metrics": {
      "messagesSent": "number", "messagesFailed": "number", "pollingErrors": "number",
      "lastDeliveryAt": "string|null", "uptimeSeconds": "number", "reconfigures": "number"
    }
} }
// Response 400
{ "error": "Token requerido" }
```

### `GET /telegram/bot-status`
Requiere rol ADMIN. Estado del ciclo de vida del bot de Telegram.
```json
// Response 200
{ "data": {
    "state": "disabled|starting|ready|degraded|stopped|failed",
    "running": "boolean",
    "username": "string",
    "lastError": "string|null",
    "lastStateChangeAt": "string|null",
    "startedAt": "string|null",
    "stoppedAt": "string|null",
    "lastErrorAt": "string|null",
    "tokenConfigured": "boolean",
    "configuredUsername": "string",
    "metrics": {
      "messagesSent": "number", "messagesFailed": "number", "pollingErrors": "number",
      "lastDeliveryAt": "string|null", "uptimeSeconds": "number", "reconfigures": "number"
    }
} }
```
`state` es un enum de ciclo de vida (ISSUE-047): `disabled`, `starting`, `ready`, `degraded`, `stopped`, `failed`. Un `polling_error` degrada el estado a `degraded` sin detener el envío (`running` permanece `true`).

---

## 9. Recetas

### `GET /recipes`
- Response: `{ data: [{ id, name, species, ... }] }`

### `GET /recipes/:id`
- Response: Detalle de receta con umbrales por fase

### `POST /recipes`
```json
{ "name": "string", "species": "string", "incubationTempMin": 22, ... }
```

### `PUT /recipes/:id`
Actualiza receta completa.

---

## 10. Especies

### `GET /species`
- Response: `{ data: [{ id, name, scientificName, ... }] }`

### `GET /species/:id`
- Response: Detalle de especie

### `POST /species`
Crea nueva especie.

### `PUT /species/:id`
Actualiza especie.

### `DELETE /species/:id`
Elimina especie.

---

## 11. Ciclos de Cultivo

### `GET /cycles`
- Query: `?status=ACTIVE|PLANNED|COMPLETED|ABORTED&chamberId=N`
- Response: `{ data: [{ id, recipeId, deviceId, chamberId, species, status, currentPhase, ... }] }`

### `GET /cycles/:id`
- Incluye receta y transiciones de fase recientes
- Response: Detalle del ciclo

### `POST /cycles`
Requiere auth.
```json
{ "recipeId": 1, "deviceId": 1, "species": "P. cubensis", "strain": "string", "startDate": "ISO" }
```
Al activar (PATCH status=ACTIVE), si tiene deviceId vinculado, publica setpoints inmediatamente por MQTT.

### `PATCH /cycles/:id`
```json
{ "status": "ACTIVE"|"COMPLETED"|"ABORTED", "currentPhase": "INCUBATION"|"FRUITING"|"MAINTENANCE", "notes": "string" }
```
Al cambiar status a ACTIVE con deviceId: carga receta → extrae umbrales → publica config por MQTT.

### `POST /cycles/:id/transition`
Requiere auth. Transición manual de fase.
```json
{ "toPhase": "FRUITING", "notes": "string" }
```

### `GET /cycles/:id/transitions`
- Response: `{ data: [{ fromPhase, toPhase, triggerType, ... }] }`

### `POST /cycles/:id/abort`
Requiere auth. Aborta el ciclo y apaga actuadores.

### `GET /cycles/:id/states`
- Response: `{ data: [{ snapshotDate, ... }] }`

### `GET /cycles/:id/environment-summary`
- Response: Resumen ambiental del ciclo

---

## 12. Bioactivos

### `GET /cycles/:id/bioactives`
- Query: `?compoundName=string&from=ISO&to=ISO&limit=100`
- Response: `{ data: [{ compoundName, concentration, unit, analysisDate, ... }] }`

### `POST /cycles/:id/bioactives`
Requiere auth.
```json
{ "compoundName": "string", "concentration": 1.5, "unit": "mg/g", "analysisDate": "ISO" }
```

### `GET /cycles/:id/bioactives/correlation`
- Response: Correlación entre bioactivos del ciclo

---

## 13. Alarmas

### `GET /alarms`
- Query: `?severity=CRITICAL|HIGH|MEDIUM|LOW&deviceId=N`
- Response: `{ data: [{ id, deviceId, severity, message, acknowledged, resolved, ... }] }`

### `GET /alarms/stats`
- Response: `{ total, unacknowledged, bySeverity: { CRITICAL, HIGH, MEDIUM, LOW } }`

### `GET /alarms/:id`
- Response: Detalle de alarma

### `PATCH /alarms/:id/acknowledge`
Requiere auth. Marca alarma como reconocida.

### `PATCH /alarms/:id/resolve`
Requiere auth. Marca alarma como resuelta.

---

## 14. Analytics

### `GET /chambers/:chamberId/analytics`
- Query: `?from=ISO&to=ISO&period=day|week|month`
- Response: Analytics agregados de un chamber

---

## 15. Settings (Perfil)

### `GET /settings/profile`
Requiere auth.
- Response: `{ data: { user, preferences } }`

### `PATCH /settings/profile`
Requiere auth.
```json
{ "username": "string", "email": "string", "preferences": { "theme": "dark"|"light", ... } }
```

### `POST /settings/change-password`
Requiere auth.
```json
{ "currentPassword": "string", "newPassword": "string" }
```

### `GET /settings/system`
Requiere rol SUPER_ADMIN. Configuración del sistema.

### `PATCH /settings/system`
Requiere rol SUPER_ADMIN.
```json
{ "settings": [{ "key": "string", "value": "string" }] }
```

### `POST /settings/system/seed`
Requiere rol SUPER_ADMIN. Siembra defaults del sistema.

### `GET /settings/system/public`
Configuración pública del sistema (sin auth).

---

## 16. API Keys

### `GET /api-keys`
Requiere auth. Lista API keys del usuario.

### `POST /api-keys`
Requiere auth. Crea nueva API key.

### `POST /api-keys/:id/rotate`
Requiere auth. Rota una API key (genera nueva, invalida la anterior).

### `DELETE /api-keys/:id`
Requiere auth. Elimina una API key.

---

## 17. Subscriptions

### `GET /subscriptions/mine`
Requiere auth. Devuelve suscripción del usuario.

### `GET /subscriptions/mine/usage`
Requiere auth. Uso actual de la suscripción. Incluye `pendingPlan` y `requestedAt` si hay upgrade pendiente.

### `PATCH /subscriptions/mine/upgrade`
Requiere auth. **Retorna 202 Accepted** con estado REQUESTED (no aplica directamente).
```json
{ "plan": "FREE"|"BASIC"|"PREMIUM" }
```
Response 202:
```json
{
  "data": { "id": 1, "plan": "FREE", "pendingPlan": "BASIC", "requestedAt": "..." },
  "message": "Upgrade a BASIC solicitado. Confirme para aplicar."
}
```

### `POST /subscriptions/:id/confirm`
Requiere auth. Confirma upgrade pendiente y aplica el cambio de plan.
Response 200:
```json
{
  "data": { "id": 1, "plan": "BASIC", "pendingPlan": null },
  "message": "Plan actualizado a BASIC"
}
```

### `PATCH /subscriptions/mine/cancel`
Requiere auth. Cancela suscripción (vuelve a FREE).

### `GET /subscriptions`
Requiere auth + rol ADMIN. Lista todas las suscripciones.

---

## 18. Admin

Requiere rol ADMIN o superior.

### `GET /admin/users`
- Response: `{ data: [{ id, username, email, role, ... }] }`

### `GET /admin/users/:id`
- Response: Detalle de usuario

### `PATCH /admin/users/:id/role`
Requiere rol SUPER_ADMIN.
```json
{ "role": "ADMIN"|"SUPER_ADMIN"|"USER" }
```

### `PATCH /admin/users/:id/toggle-active`
Activa/desactiva usuario.

### `GET /admin/audit-logs`
- Query: `?userId=N&action=string&resource=string&from=ISO&to=ISO&limit=100`
- Response: `{ data: [{ userId, action, resource, resourceId, details, createdAt }] }`

---

## 19. Monitoreo

> **Control de acceso (ISSUE-003/BE-003):** las rutas `/monitoring/*` requieren **autenticación (Bearer JWT) + rol ADMIN** (RBAC, ADR-007). La única ruta pública del subsistema de monitoreo es `GET /health`. Sin token → `401 { "error": "Autenticación requerida", "code": "AUTH_REQUIRED" }`; token de rol inferior a ADMIN (OPERATOR/VIEWER) → `403 { "error": "Se requiere rol ADMIN o superior" }`.

### `GET /health`
Health check básico. **Única ruta pública** del subsistema de monitoreo (ISSUE-003).

### `GET /monitoring/metrics`
Métricas del sistema (uptime, memoria, etc.). **Requiere auth + rol ADMIN.**

### `GET /monitoring/health/db`
Health check de la base de datos. **Requiere auth + rol ADMIN.**

### `GET /monitoring/logs`
Logs estructurados filtrables (`level`, `module`, `limit`, `offset`). **Requiere auth + rol ADMIN.** El acceso a este endpoint queda registrado en el access log HTTP (no se excluye del `autoLogging.ignore` — ISSUE-003).

### `GET /monitoring/stream`
SSE de monitoreo. **Requiere auth + rol ADMIN.**

---

## 20. Diagnósticos MQTT

### `GET /diag/mqtt`
Requiere auth + rol ADMIN. Estado de la conexión MQTT.

### `POST /diag/mqtt/publish`
Requiere auth + rol ADMIN. Publica mensaje de prueba.
```json
{ "topic": "string", "payload": "string" }
```

---

## 21. Tiempo Real

### `GET /events` (SSE — LIVE)
Server-Sent Events (autenticación via query param `?token=jwt`). **Es la única fuente de eventos consumida por el frontend.** El feed es la memoria del servidor (`sse/events`); no hay persistencia.

El cliente debe normalizar cada evento al shape `{ id, type, timestamp, deviceId, severity, message, metadata }` antes de renderizar (ver `frontend/src/features/events/pages/EventsPage.jsx`).

Eventos:
| Evento | Descripción |
|--------|-------------|
| `connected` | Heartbeat/confirmación de suscripción (usado como indicador de conexión) |
| `ack` | Confirmación de comandos del dispositivo |
| `state` | Cambios de estado de actuadores |
| `telemetry` | Datos de sensores en tiempo real (alta frecuencia; OFF por defecto en la UI) |
| `alarm` | Alarmas del sistema |
| `control_eval` | Evaluaciones del control engine |
| `health` | Reportes de salud del dispositivo |
| `maintenance` | Eventos de mantenimiento |
| `phase_transition` | Transiciones de fase del ciclo |
| `device_health` | Reportes de salud del dispositivo (payload `status`) |
| `device_status_changed` | Cambio de estado/desconexión del dispositivo |

### `GET /events/device/:deviceId`
SSE filtrado por dispositivo específico (mismo stream, filtro server-side).

### REST `/api/v1/events` + `models/Event.js` — LEGACY (sin consumo frontend)
- `backend/src/routes/events.js` + `backend/src/models/Event.js` forman un módulo **legacy/escrito-huérfano**: el modelo solo se lee en `routes/events.js` y en la métrica `Event.count()` de `routes/monitoring.js`. **Nada escribe** en la tabla `events`.
- Desde esta refactorización, el frontend **no depende** de `GET /api/v1/events` ni `GET /api/v1/events/device/:deviceId` (se eliminaron `getEvents`/`getDeviceEvents` de `client.js`).
- **No eliminar ni tocar backend**: se conserva como documentación de deuda técnica y su eliminación queda fuera del alcance actual.

---

## 22. Errores

```json
// 400 Bad Request
{ "error": "VALIDATION", "message": "..." }
// 401 Unauthorized
{ "error": "Token requerido" } | { "error": "Token expirado", "code": "TOKEN_EXPIRED" } | { "error": "Autenticación requerida", "code": "AUTH_REQUIRED" } (denegación por defecto — ISSUE-002)
// 401 Aprovisionamiento (ISSUE-001)
{ "code": "AUTH_REQUIRED" } | { "code": "INVALID_TOKEN" } | { "code": "TOKEN_EXPIRED" } | { "code": "TOKEN_REVOKED" } | { "code": "TOKEN_EXHAUSTED" }
// 403 Forbidden
{ "error": "Sin acceso a este dispositivo" } | { "error": "Sin acceso a este ciclo" } | { "code": "TOKEN_DEVICE_MISMATCH" } (token vinculado a otro deviceId)
// 404 Not Found
{ "error": "NOT_FOUND", "message": "..." }
// 429 Too Many Requests
{ "error": "Demasiadas solicitudes, intente más tarde" } | { "error": "Demasiados intentos de registro", "code": "RATE_LIMIT_EXCEEDED" } (register anónimo por IP)

> **Rate limiting (ISSUE-019):** el límite global por IP se aplica a **todos** los endpoints `/api/v1/*` — incluidos `GET /devices` y `GET /actuators` (ya no hay skip para polling anónimo). Los usuarios autenticados se rigen además por la cuota de su plan (`rate_limit_exceeded`, ver `subscriptionRateLimit.js`). El polling anónimo del firmware queda sujeto al límite global hasta que migre a credenciales/identidad (ISSUE-059/PR-M).
// 500 Server Error
{ "error": "SERVER_ERROR", "message": "..." }
// 500 Server Error — /monitoring/* y /admin/* (ISSUE-003): detalle interno SOLO en logs de servidor; el cliente recibe mensaje genérico sin err.message
{ "error": "SERVER_ERROR", "message": "Error interno del servidor" }
// 503 Service Unavailable
{ "error": "MQTT_DISCONNECTED", "message": "MQTT no conectado" }
```

---

## 23. Aprovisionamiento de Dispositivos

Los dispositivos se registran contra el broker MQTT a través de `POST /devices/register`. Para impedir la acuñación anónima de credenciales (ISSUE-001), la ruta exige sesión autenticada o un **token de aprovisionamiento de un solo uso** emitido por el operador.

### 23.1 Emisión del token (operador, fuera de banda)

- CLI: `npm run provision:token` en `backend/` (ver `backend/src/scripts/create-provisioning-token.js`).
- Producción exige `PROVISION_TOKEN_CREATE_SECRET` + `--secret` (guard contra uso accidental).
- Opciones: `--device-id <id>` (vincula el token a un único `deviceId`), `--max-uses <n>` (cuota; default 1), `--expires-in <days>`, `--label "<text>"`.
- Formato: `musht_<raw>` (32 bytes aleatorios, base64url). El servidor **solo guarda el hash SHA-256** (`tokenHash`); el raw se muestra una única vez en stdout y no es recuperable.

### 23.2 Consumo

- El firmware envía `X-Provision-Token: musht_<raw>` en el registro.
- `usesRemaining` se decrementa atómicamente (UPDATE con condición `usesRemaining > 0`); si llega a 0 el token queda exhausto y no reutilizable.
- El token se reintegra (refund) si el body no incluye `deviceId` o el flujo falla con 5xx.
- Tabla `provisioning_tokens`: `tokenHash` (único), `label`, `maxUses`, `usesRemaining`, `deviceId` (opcional), `expiresAt`, `revokedAt`, `createdAt`.

### 23.3 Recarga del broker (idempotente)

- La ACL/password de Mosquitto se recargan con **SIGHUP** al contenedor (`docker kill --signal HUP mush2-mosquitto`), sin `docker restart` (ADR-028-R01). El backend lo encola con debounce (500 ms) vía `scheduleReload()`.