# Contrato API REST — Mush2 v1

> Base URL: `/api/v1`
> Formato: JSON
> Autenticación: JWT via header `Authorization: Bearer <token>`
> Denegación por defecto (ISSUE-002/004/005): sin credenciales válidas, toda ruta distinta de la whitelist anónima del firmware devuelve `401 { "error": "Autenticación requerida" }`. Whitelist anónima (solo firmware): `POST /devices/register` y `GET /actuators?deviceId=`.
> Propiedad de recursos (ISSUE-002/004/005): los endpoints de tenant filtran/deniegan por propietario y vía `UserChamberAccess`; mutaciones del catálogo de especies exigen rol `ADMIN`; `PATCH /actuators/:channel` y `/devices/:id/actuators/:channel` NO auto-crean el dispositivo (404 si no existe).

---

## 1. Autenticación

### `POST /auth/register`
```json
// Request
{ "username": "string", "email": "string", "password": "string" }
// Response 201
{ "token": { "accessToken": "jwt...", "refreshToken": "..." }, "user": { "id","username","email","role" } }
```

### `POST /auth/login`
```json
// Request
{ "username": "string", "password": "string" }
// Response 200
{ "token": { "accessToken": "jwt...", "refreshToken": "..." }, "user": { "id","username","email","role" } }
```

### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "string" }
// Response 200
{ "token": { "accessToken": "jwt...", "refreshToken": "..." } }
```

### `POST /auth/logout`
Requiere auth. Invalida refresh token.

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
Registro de dispositivo desde el firmware.

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

### `POST /devices/:id/integrations/thingspeak`
Configura integración con ThingSpeak.
- `readKey`/`writeKey` se almacenan **cifrados** en `IntegrationCredentials` (única fuente de secretos, ISSUE-043).
- `channelId` y `syncInterval` se persisten en el dispositivo (config operacional no secreta).
- Nunca se devuelven las claves vía `GET /devices*` ni el PATCH de device acepta claves en claro.

### `POST /devices/:id/thingSpeak/validate`
```json
{ "apiKey": "string" }
// Response 200
{ "valid": true, "channels": [{ id, name, readKey, writeKey }] }
```

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
Requiere auth. Uso actual de la suscripción.

### `PATCH /subscriptions/mine/upgrade`
Requiere auth.
```json
{ "plan": "FREE"|"PRO"|"ENTERPRISE" }
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

### `GET /health`
Health check básico.

### `GET /monitoring/metrics`
Métricas del sistema (uptime, memoria, etc.).

### `GET /monitoring/health/db`
Health check de la base de datos.

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
{ "error": "Token requerido" } | { "error": "Token expirado", "code": "TOKEN_EXPIRED" } | { "error": "Autenticación requerida" } (denegación por defecto — ISSUE-002)
// 403 Forbidden
{ "error": "Sin acceso a este dispositivo" } | { "error": "Sin acceso a este ciclo" }
// 404 Not Found
{ "error": "NOT_FOUND", "message": "..." }
// 429 Too Many Requests
{ "error": "Demasiadas solicitudes, intente más tarde" }
// 500 Server Error
{ "error": "SERVER_ERROR", "message": "..." }
// 503 Service Unavailable
{ "error": "MQTT_DISCONNECTED", "message": "MQTT no conectado" }
```
