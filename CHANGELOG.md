# Changelog — Mush2

## [0.8.0] — 2026-06-24 — Fase 8 (Multi-Cámara)

### Firmware
- `DeviceManager`: deviceId dinámico derivado de MAC address, persistido en EEPROM al primer boot
- Eliminado `DEVICE_ID` hardcoded de `config.h` — ahora cada nodo tiene identidad única
- Todos los mensajes MQTT usan el deviceId real (MAC) en tópicos y payloads

### Backend
- Auto-registro universal de nodos: todos los handlers MQTT (`handleOnline`, `handleAck`, `handleDeviceState`) ahora crean el dispositivo si no existe via `findOrCreate`

### Frontend
- Dashboard multi-cámara con selector de dispositivo activo
- Fila de promedios agregados (T°/HR) cuando hay 2+ cámaras
- SSE filtrado por dispositivo seleccionado
- `chamberName` visible en targetas de dispositivo

### Docs
- `docs/roadmap.md` extendido a 18 fases (F15-F18: Gemelo Digital, Marketplace, App Móvil, Certificación)
- `docs/roadmap/milestone.md` actualizado con M8-M10 planificados
- `docs/roadmap/otras-consideraciones.md` reestructurado como backlog técnico
- `docs/roadmap/consideraciones.md` y `roadmap-v2.md` archivados (contenido integrado)

---

## [0.7.0] — 2026-06-12 — Fase 7 (Producción)

### Firmware
- OTA: ArduinoOTA para actualización local + HTTP Update remoto
- Suscripción `mush2/cmd/{id}/ota` con acciones `activate` (modo OTA) y `update` (HTTP update)
- Versionado del firmware expuesto vía `getVersion()`

### Backend
- `/api/v1/monitoring/metrics` endpoint con estadísticas del sistema
- `/api/v1/health/db` y `/health/mqtt` health checks específicos
- Script `src/scripts/backup-db.js` para backup programado de PostgreSQL
- Dependencia: `pg_dump` para backups

### CI/CD (GitHub Actions)
- Workflow `ci.yml` con 3 jobs paralelos: firmware build, backend test, frontend build
- Backend test con servicio PostgreSQL 18
- Frontend build con Node 24 + pnpm
- Trigger en push/PR a main y develop, y en releases

### Documentación
- Manual de usuario completo en `docs/user/manual.md` (español)
- Cubre: arquitectura, conexión inicial, dashboard, dispositivos, recetas, ciclos, planes, troubleshooting

## [0.6.0] — 2026-06-12 — Fase 6 (Multi-tenencia)

### Backend
- Modelos: Subscription, UserChamberAccess, ApiKey
- Planes FREE (1 device), BASIC (5), PREMIUM (50) con límites por recurso
- Tenant middleware: filtra queries por userId automáticamente
- checkDeviceAccess middleware: verifica ownership + acceso compartido
- Device, Recipe, CultivationCycle ahora tienen userId
- POST /devices registra dispositivo asignado al usuario autenticado
- Límite de dispositivos/recetas validado contra el plan activo
- API Keys: CRUD con límite por plan, prefijo `mush2_`
- Admin endpoints: listar usuarios, cambiar rol, toggle active, audit logs

### Frontend
- Página de login (JWT)
- Página Settings con información del plan y upgrade
- Interceptor axios: autorización automática + refresh token
- Badge de usuario en header + botón de cerrar sesión
- Rutas protegidas: sin login → pantalla de login

## [0.5.0] — 2026-06-12 — Fase 5 (Hardening)

### Firmware
- Máquina de estados: BOOT → INIT → WIFI → NORMAL → DEGRADED → ERROR → RECOVERY → SAFE
- Watchdog hardware 8s + software 30s con feed en cada loop
- EEPROM: contador de reinicios, modo SAFE tras 5 reinicios consecutivos
- MQTT: exponential backoff (5s – 180s) + LWT online/offline retain
- Fallback automático a modo LOCAL sin conexión WiFi/MQTT

### Backend
- Autenticación JWT: login/refresh/logout + token rotation
- RBAC: SUPER_ADMIN, ADMIN, OPERATOR, VIEWER con jerarquía de roles
- Rate limiting: 100 req/15min en `/api/*`
- Helmet CSP + CORS hardening
- Cifrado AES-256-GCM para claves ThingSpeak
- Audit logging de operaciones sensibles
- MQTT: exponential backoff + alarm dedup backend-side
- Pruebas unitarias: Jest + Supertest configurados
- Seed: usuario admin (SUPER_ADMIN) creado automáticamente

### Frontend
- ErrorBoundary global con recarga
- Skeleton loading para métricas/tarjetas/tablas
- AuthContext para manejo de tokens JWT
- Diseño responsive (768px + 480px breakpoints)

## [0.4.0] — 2026-06-12 — Fase 4

### Firmware
- `hysteresis_controller`: reglas locales con histéresis (temp, hum, CO2)
- SSR1 = calefacción (temp), SSR2 = ventilación (temp+CO2), SSR3 = humidificación (hum)
- Modos LOCAL (reglas), REMOTE (comandos MQTT), OFF
- Suscripción `mush2/cmd/{id}/config` para setpoints remotos
- Alarmas automáticas en `mush2/event/{id}/alarm` (HIGH_TEMP, LOW_TEMP, HIGH_HUM, etc.)
- Setpoints por defecto en config.h (DEFAULT_TEMP_MIN/MAX, etc.)

### Backend
- `controlEngine.js`: evaluación periódica cada 60s de ciclos activos
- Comparación telemetría vs setpoints de receta por fase
- Transición automática INCUBATION → FRUITING → MAINTENANCE → COMPLETED
- Snapshots de estado en CycleState por cada evaluación
- Emisión de eventos `control_eval` vía SSE

### Frontend
- Página `Ciclos` con tarjetas por ciclo (fase, especie, receta, fechas)
- Panel de alertas en Dashboard

## [0.3.0] — 2026-06-12 — Fase 3

### Firmware
- `ens160_sensor`: driver ENS160 (I2C 0x53), AQI/eCO₂/TVOC
- Calibración del ENS160 con temperatura/humedad del AHT21
- CO₂ y VOC incluidos en telemetría MQTT
- Modo DEGRADED si ENS160 no responde (operación solo con AHT21)
- `Wire.begin()` movido a `main.ino` (I2C compartido entre ambos sensores)
- Dependencia añadida: DFRobot_ENS160

### Backend
- Modelos: `Recipe`, `CultivationCycle`, `CycleState`
- CRUD recetas: GET/POST/PUT `/api/v1/recipes`
- CRUD ciclos: GET/POST/PATCH `/api/v1/cycles`
- `thingSpeakSync.js`: sincronización de telemetría desde ThingSpeak
- Seed: receta "Melena de León" (Hericium erinaceus)
- Fix: import paths en seed.js

### Frontend
- Página `Recipes` con tabla de recetas y formulario de creación
- Navegación con NavLink (Dashboard / Recetas)

## [0.2.0] — 2026-06-12 — Fase 2

### Firmware
- `ssr_controller`: 3 canales SSR, minOn/maxOn timers, safety limits
- Suscripción MQTT `mush2/cmd/{id}/actuator` (QoS 2) con parseo JSON
- ACK automático en `mush2/event/{id}/ack`
- Estado periódico de actuadores en `mush2/telemetry/{id}/state` (retain)
- Dependencia añadida: ArduinoJson 7

### Backend
- Modelo `Actuator` (deviceId, channel, state, mode, lastCommand, lastAck)
- `GET /api/v1/devices/:id/actuators`
- `PATCH /api/v1/devices/:id/actuators/:channel` → publica comando MQTT
- Manejo de ACK: actualiza DB, emite SSE
- SSE endpoint `GET /events` (eventos ack, state, telemetry)
- Fix: path de `.env` corregido

### Frontend
- Página `DeviceDetail` con métricas en tiempo real + controles de actuador
- Componente `ActuatorControl` (toggle ON/OFF por canal SSR)
- Hook `useSSE` para eventos en tiempo real vía EventSource
- Routing con React Router (Dashboard → DeviceDetail)
- Dashboard linkea a detalle de dispositivo

## [0.1.0] — 2026-06-12 — Fase 1

### Backend
- Setup Express 5 + Sequelize 6 + PostgreSQL
- Modelos: Device, Sensor, Telemetry, Event
- Servicio MQTT con failover entre 2 brokers
- API REST: listar dispositivos, telemetría, health check
- Persistencia automática de telemetría entrante

### Frontend
- Setup Vite + React 18 + React Router
- Dashboard con MetricCards (temp, hum, CO2, VOC)
- Polling automático cada 10s
- Proxy API Vite → Backend

### Firmware
- Setup PlatformIO (WeMos D1 Mini, ESP8266)
- WiFi manager: 2 redes con failover
- Driver AHT21 (I2C 0x38) — temperatura y humedad
- MQTT handler: publicación telemetría, boot event, online status
- ThingSpeak client: envío HTTP de respaldo
- `generate_config.py`: genera `config.h` desde `.env`
