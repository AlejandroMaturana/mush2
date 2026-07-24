# Changelog — Mush2

## 2026-07-24

### Backend — v1.2.0

- **refactor(backend)**: Simplificación de `mqttBridge` a un único broker con credenciales por entorno
- **feat(docker)**: Configuración completa de Mosquitto con TLS (puerto 8883), autenticación y ACLs estrictas
- **test(backend)**: Nuevos tests de conexión segura, resiliencia ante broker caído y backward compatibility (total: 135 tests passing)

### Frontend — v1.12.0

- **feat(frontend)**: Añadido hook `useVersionManifest` compartido
  - Fetch con cache a nivel de módulo
  - Eliminación de versiones hardcodeadas
- **refactor(frontend)**: Actualización de `Sidebar` y `StatusFooter`
  - Sidebar ahora usa versión dinámica del manifest
  - StatusFooter muestra versiones de Frontend, Backend y Firmware
  - Mejoras en diseño responsive
- **style(frontend)**: Nuevos estilos para `.status-footer-center` con soporte responsive

### Firmware — v0.21.0

- **feat(firmware)**: Implementación de conexión MQTT segura
  - `WiFiClientSecure` + Root CA (ISRG Root X1)
  - Last Will and Testament (LWT) para detección rápida de desconexiones
  - Backoff exponencial y manejo de entornos (DEVELOPMENT/STAGING/PRODUCTION)
  - Separación de `MQTT_USER` y `DEVICE_ID`

### Docs — v0.1.4

- **docs(adr)**: Creación de ADR-023 (Infraestructura MQTT Segura) y ADR-024 (Estrategia de Despliegue HTTPS)
- **docs(rfc)**: Actualización profunda de RFC-0001 con decisiones clave de TLS
- **docs(adr)**: Actualización del README de ADRs y renumeración/migración
- **docs(governance)**: Actualización de Definition of Done con verificaciones de Fase 10 (memory footprint, compatibilidad)

### Scripts & Tooling

- **feat(scripts)**: Implementar agregación centralizada de versiones
  - Nueva función `collectVersions()` como fuente única de verdad
  - `generateVersionManifest()` genera `.changeset/version-manifest.json` y copia al frontend
  - Generación automática de script de release (`release.bat`)
  - Refactor del flujo principal para mayor reutilización

- **chore(scripts)**: Nuevo script `verify-memory-footprint.sh` para enforzar límites de memoria (< 80KB y freeHeap > 30KB)

**Resultado**
- Fase 10 completada — Infraestructura MQTT segura con TLS, autenticación, LWT y documentación sólida para guiar las siguientes fases.
- Versionado consistente y mantenible en toda la aplicación mediante un manifest centralizado.

## 2026-07-24

### Backend — Domain-First refactoring (arquitectura hexagonal / DDD) — v1.1.0

- Implementado **Shared Kernel** con `Result<T, E>`, `DomainError`, `Clock`, `UUID`, `EventBus` y `Logger`
- Nueva **Domain Layer** pura: Entities (`Run`, `Chamber`, `Recipe`, `Telemetry`, `Alarm`), Value Objects y Policies
- **Application Layer** con use cases granulares (`StartRun`, `AbortRun`, `ReceiveTelemetry`, `RaiseAlarms`, `ComputeActuators`, etc.)
- **Control Engine** como orquestador principal con `SafetyRule` y guards de seguridad
- **Persistence Layer** con mappers bidireccionales y repositorios Sequelize
- Migración de `cultivation_cycles` → `runs`
- Suite completa de tests (77 tests passing)
- Barrel exports por capa y configuración actualizada de Vitest
- Actualización de documentación de arquitectura y roadmap (Fase 9 iniciada)

### Docs — v0.1.3

- Actualizado engineering-architecture.md
- Roadmap y Milestone actualizados con estado de Fase 9

## 2026-07-22

### Backend — major refactoring and new health monitoring system — v1.0.0

- Añadido sistema de monitoreo de salud de dispositivos (`deviceHealthService`)
- Implementado `offlineWatchdog` para detectar dispositivos desconectados
- Optimización significativa del startup del servidor con estados de readiness
- Mejoras en configuración de base de datos, pool de conexiones y manejo de deadlocks
- Mejoras en endpoints de monitoring y rutas

### Frontend — New shared component library and page consolidation — v1.11.0

- Migración completa de páginas a la nueva librería de componentes compartidos (`Panel`, `EntityHeader`, `StatusCard`, `DashboardGrid`, `EventFeed`, etc.)
- Nuevas páginas: `CycleDetailPage`, `DeviceListPage` y paneles específicos
- Nueva capa API (`client.js`), `AuthContext`, hook `useSSE` y Auth Modal
- Reorganización de rutas, SettingsNav y estructura de componentes
- Mejoras importantes de estilos: tokens CSS corregidos, clases reutilizables, responsive y light mode

**Styles**
- Corrección de custom properties rotas y adición de tokens RGB y efectos
- Extracción de múltiples clases reutilizables (`.form-group`, `.settings-row`, badges, alerts, etc.)
- Soporte responsivo con breakpoints
- Limpieza de código legacy y componentes duplicados

### Docs — Migración y Reorganización de Documentos Técnicos — v0.1.2

- - **docs(adr)**: Migración y renumeración de ADRs a la nueva estructura
- ADR-019 a ADR-022 movidos desde `.aaron/` y renumerados
- Actualizado formato y encabezados
- **docs(governance)**: Reorganización de archivos de gobernanza
- `AGENT-BOUNDARIES.md` y `TASK-TEMPLATES.md` movidos a `docs/governance/` con nombres en lowercase
- **docs(architecture)**: Reorganización de documentos de arquitectura
- Movidos y renombrados: `capability-matrix`, `change-impact`, `engineering-architecture`, `mvp` y `use-cases`
- **docs(operations)**: Limpieza y movimiento de runbooks
- `DEBUG-RUNBOOK.md` movido a `docs/operations/`
- Eliminada carpeta obsoleta `backend-spec/` y `.aaron/`
- **docs(roadmap)**: Actualización de roadmap y milestones
- Fase 8 marcada como **COMPLETADA**
- Fase 9 (Refundación Domain-First) iniciada
- Reorganización de fases 10-19 con nuevas dependencias
**Resultado**: Estructura documental mucho más limpia, coherente y mantenible bajo la nueva taxonomía.

**Otros**
- Limpieza general de código muerto y archivos legacy

## 2026-07-16

### Backend — Fixed - v0.23.1

Al cambiar el estado de un ciclo a `ACTIVE` (START), ahora se cargan los setpoints de la fase actual de la receta y se publican inmediatamente vía MQTT al dispositivo correspondiente.
Eliminados prefijos duplicados `/cycles/cycles/` en todas las rutas del backend.
Eliminadas rutas legacy duplicadas en `recipes.js` que interferían con las rutas de `cycles.js`.
Exportada función `getPhaseThresholds` en `ControlEngine.js` para su uso desde otros módulos.

### Frontend — Fixed - v1.10.1

Corregida alternancia de temas claro/oscuro: el `useEffect` ahora alterna correctamente entre las clases `light` y `dark`.
Corregido uso de `client.put()` por `client.patch()` al actualizar ciclos.
Corregido manejo de respuesta de `actuators` (ahora retorna `data.data ?? data`).
Corregido componente `<Navigate>` en `routes.jsx` (ahora envuelto correctamente como componente).
Corregidas varias rutas de API:
`/analytics/chamber/:id` → `/chambers/:id/analytics`
`/audit-logs` → `/admin/audit-logs`
`/devices/:id/telegram` → `/telegram/device/:id`

## 2026-07-16

### Backend — v0.23.0

- Device: +lastFirmwareState, +controlMode (ENUM)
DeviceHealth: +bootTestPassed, +bootTestFailReason
Telemetry: +AQI al ENUM sensorType
Subscription: aumento de límite FREE plan
Mapeo firmwareState → Device.status
Persistencia de controlMode
Almacenamiento de AQI y bootTest data
Envío de setpoints + phase en comandos MQTT
TEMP_CRITICAL / TEMP_RECOVERY desde SystemSettings
Fix SSE connected event header
Forward de eventos health, maintenance y phase_transition
Cascade DELETE robusto para Device
Remover RUNNING de query analytics
Rate limit desactivado en development

### Frontend — v1.10.0

- Null telemetry → gaps en charts
Mostrar controlMode, lastFirmwareState, bootTest y AQI
Consumir eventos health/maintenance vía SSE
Rangos dinámicos desde receta"
README.md: Añade links del proyecto
Eliminar textos decorativos fake
Conectar SubscriptionSettings con datos reales

### Firmware (ESP32-S3) — v0.21.0

- Reemplazar millis() por getTimestamp() (epoch)
Unificar publishStatus() en conexión
Inclusión correcta de AQI, bootTest y status completo
Bump versión a 0.21.0

### Docs — v0.1.1

ADR-018: Functional Integrity Stabilization
Actualización de roadmap.md y milestone.md
Entrada en PROJECT_JOURNAL.md"

## 2026-07-13

### Backend — v0.22.0 — Bioactive Traceability

- Nuevo modelo `BioactiveProfile` — registro de análisis de compuestos bioactivos por ciclo
- Servicio `bioactiveAnalyzer.js` — correlación compuestos-ambiente, resumen por fase, insights automáticos
- Asociación CycleState ↔ BioactiveProfile en models/index.js
- Rutas en `cycles.js`: GET/POST bioactives, GET correlation, GET environment-summary

### Frontend — v1.9.0 — Bioactive Traceability

- Nueva página `BioactiveDashboard.jsx` — formulario de análisis, barras de compuestos, entorno por fase, historial
- Nuevo componente `CompoundBar.jsx` — barra de concentración media con rango
- Integración en `Cycles.jsx` — badge "BIOACTIVES" en CycleCard para ciclos activos/completados
- Ruta `/cycles/:id/bioactives` añadida en App.jsx
- Funciones API en `client.js`: getBioactives, addBioactive, getBioactiveCorrelation, getEnvironmentSummary

### Docs — v0.17.14 — Capacidades y Suscripción

- `authorization-model.md` — Modelo de autorización
- `capability-catalog.md` — Catálogo de capacidades
- `qos-policy.md` — Políticas de QoS
- `RFC-0006-realtime-streaming.md` — Streaming en tiempo real
- `RFC-0007-device-limits.md` — Límites de dispositivos
- `RFC-0008-button-interaction.md` — Interacción con botones
- **ADR-016**: Actualización de referencias
- **architecture.md**: Nuevo modelo de capacidades y suscripción
- **backend.md**: Actualización de roles, permisos y suscripciones
- **database.md**: Añadida entidad de suscripción

### Backend — v0.21.1

- Ajustado al patrón estándar `../config/database.js` usado por el resto de modelos
- Corregido tipo de campo para mejor rango de valores en métricas de mantenimiento predictivo
- Eliminadas definiciones duplicadas de bootTest y sensorRegistry (ya están en sus .cpp)
- Añadidas todas las variables globales faltantes
- Mejora de organización y compilación limpia

### Firmware (ESP32-S3) — v0.20.1

- Ajustado al patrón estándar `../config/database.js` usado por el resto de modelos
- Corregido tipo de campo para mejor rango de valores en métricas de mantenimiento predictivo
- Eliminadas definiciones duplicadas de bootTest y sensorRegistry (ya están en sus .cpp)
- Añadidas todas las variables globales faltantes
- Mejora de organización y compilación limpia

### Backend — v0.21.0 — Device Maintenance

- Nuevo modelo DeviceMaintenance
- Handler handleMaintenance() + suscripción a +/maintenance topic
- GET /devices/:id/maintenance
- GET /maintenance/latest

### Firmware (ESP32-S3) — v0.20.0 — Predictive Maintenance

- Nueva interfaz I_Sensor y registro centralizado de sensores
- Estructura de drivers modularizada
- Preparación para mejor manejo y extensibilidad de sensores
- Nueva función publishMaintenance() al topic mush2/{deviceId}/maintenance
- Soporte para onActuatorChange() desde comandos MQTT
- Nueva clase PredictiveMaintenance para tracking de tiempos de respuesta
- Monitoreo de 4 actuadores: VENT, HEATER, HUMIDIFIER, LIGHT
- Detección de degradación con umbrales y rolling window de 10 lecturas
- Integración en mqttActuatorCallback, taskSensors, taskSSR y taskTelemetry
- Evaluación cada 5 minutos y publicación cuando health < 50%
- Añadidos campos de I2C trending y predictive alerts
- Mejoras en seguimiento de fallos y métricas de recuperación
- Actualizaciones en taskSensors y adaptive frequency
- Mejoras en MqttCmdBuffer (ring buffer con TTL)
- Integración de sensor_registry y boot diagnostics
- Mejoras en inicialización y pruebas de arranque

### Firmware (ESP32-S3) — v0.19.0 — MQTT Command Buffer

- Nueva clase ring buffer con TTL (32 comandos, 5 minutos)
- Funciones: push, pop, markProcessed, clearExpired
- Permite sobrevivir desconexiones MQTT
- Seguimiento de i2cFailureCount, recovery attempts y rolling window
- i2cPredictiveAlert cuando hay >= 5 fallos en 5 minutos
- Métricas adicionales para resiliencia I2C
- Nuevas constantes: SENSOR_FREQ_*, I2C_RECOVERY_*, MQTT_CMD_*
- Preparación de parámetros configurables para taskSensors y recovery
- Intervalo dinámico entre 5s y 30s según sensorStabilityScore
- Lógica de incremento/decremento lineal de frecuencia
- Integración de phase awareness desde MQTT
- Sistema predictivo de mantenimiento: PredictiveMaintenance
- Seguimiento de tiempo de respuesta de actuadores (VENT, HEATER, HUMIDIFIER, LIGHT)
- Detección de degradación con umbrales por componente
- Publicación MQTT en topic `mush2/{deviceId}/maintenance`
- Integración en taskTelemetry: publicación cada 5 minutos si health < 50%
- Tracking de cambios de actuadores en taskSSR y mqttActuatorCallback

### Backend — v0.20.0 — Phase Transitions

- Nuevo modelo PhaseTransition con historial completo (triggerType, status, triggerData, etc.)
- Añadidos phaseStartedAt y adaptationConfig (JSONB) en CultivationCycle
- Configuradas asociaciones entre modelos
- evaluateCycle() ahora usa phaseEvaluator
- Lógica de creación y ejecución automática de transiciones
- Actualización de phaseStartedAt y emisión de evento PHASE_TRANSITION
- Rutas completas: GET/POST/PATCH cycles + POST /transition, GET /transitions
- Soporte para transición manual, abort y consulta de historial
- Montaje del router de cycles
- Evaluador de transiciones basado en sensores y tiempo
- Reglas definidas para las 7 especies (minDays, maxDays, sensorTrigger, etc.)
- Soporte para modos MANUAL, SEMI_AUTO y AUTO
- Handler MQTT para topic `+/maintenance`
- Almacena reportes en modelo DeviceMaintenance
- Emisión de evento `maintenance` en eventBus
- Nuevo modelo DeviceMaintenance (component, health, estimatedFailure, reason)
- Auto-sync con `sync({ alter: true })`
- Rutas API: GET /devices/:id/maintenance, GET /devices/:id/maintenance/latest
- Filtros por componente y rango de fechas

### Backend — v0.19.0 — Species Library

- Rutas completas: GET/POST/PUT/DELETE /api/v1/species con filtros
- Seed con 7 perfiles de especies + auto-linking de recetas existentes
- Montaje del router de species
- Nuevo modelo SpeciesProfile (name, scientificName, difficultyLevel, compounds, etc.)
- Añadido campo speciesId en Recipe (nullable)
- Configuradas asociaciones bidireccionales

### Frontend — v1.8.0 — Species Library

- Nueva página SpeciesLibrary con catálogo, filtros y modal de detalle
- RecipeComparator: comparación lado a lado con resaltado de diferencias
- Métodos API agregados en client.js (getSpecies, createSpecies, etc.)
- Añadidos enlaces a Species en Sidebar, TopBar y BottomNav
- Nuevas rutas en App.jsx (/species y /recipes/compare)
- Botón COMPARE agregado en página Recipes

### Firmware (ESP32-S3) — v0.18.0 — Health Metrics

- Añadida función publishHealth() en mqtt_client con 17 métricas (heap, stacks, sensores, etc.)
- Health Monitor ahora publica cada 60s al topic mush2/{deviceId}/health
- Backend: suscripción en mqttBridge.js + handler handleHealth()
- Nuevo modelo DeviceHealth con asociación a Device
- Nuevos endpoints: GET /devices/:id/health y /health/latest
- Preparación para monitoreo en tiempo real y alertas

### Firmware (ESP32-S3) — v0.16.2 — BLE Provisioning Bug Fixes

**Bug Fixes:**
- `button_handler.cpp`: Fixed factory reset not clearing WiFi credentials — now clears both `mush2` and `mush2_prov` NVS namespaces
- `ble_provisioning.cpp`: Implemented advertising timeout — device now restarts after `BLE_PROV_TIMEOUT_MS` (5 min) if not provisioned
- `ble_provisioning.cpp`: Removed dead code (`_setProvisioned`, `setBackendConfig`, `getBackendHost`, `getBackendPort`)

**New Feature: WiFi Failure Recovery:**
- `state_machine.cpp`: Added transitions `ST_WIFI → ST_PROVISIONING` and `ST_DEGRADED → ST_PROVISIONING`
- `tasks.cpp`: Added `reProvision()` function that clears NVS and restarts to provisioning mode
- `tasks.cpp`: `taskWiFi` now tracks WiFi failure cycles and triggers re-provisioning after `WIFI_FAIL_REPROVISION_THRESHOLD` (5) consecutive failures
- `config.example.h`: Added `WIFI_FAIL_REPROVISION_THRESHOLD` constant
- `tasks.h`: Added `wifiFailCount` extern and `reProvision()` declaration

**Frontend:**
- `Provisioning.jsx`: Added `console.warn` for device registration errors (was silently swallowed)

**Behavior:** If WiFi fails repeatedly (5 complete retry cycles with exponential backoff), the device automatically clears credentials and restarts into BLE provisioning mode, allowing the user to reconfigure WiFi.

### Firmware (ESP32-S3) — v0.16.1 — Correcciones y Botón Multifunción

**Correcciones y Limpieza:**
- `http_poller.cpp`: Añadidos paréntesis en condición OR/AND para mayor claridad
- `logger.cpp`: Agregados casts `(unsigned long)` para formateo correcto con `%lu` y `uint32_t`
- `ota_postboot.cpp`: Eliminada variable `sensorsOk` no usada + cast en `freeHeap`
- `platformio.ini`: Eliminado `-DCONFIG_ESP_TASK_WDT_TIMEOUT_S` (conflicto con SDK)

---

## 2026-07-12

### Firmware (ESP32-S3) — v0.16.0 — Botón Multifunción (SMFB)

- **ButtonDriver**: Controlador con ISR + debounce de 20ms
- **ButtonFsm**: Máquina de estados (5 estados) para detectar: Click simple, Double-click, Hold largo (3s), Hold muy largo (10s)
- **ButtonHandler**: Lógica de despacho según estado del dispositivo + feedback LED + factory reset
- **EventBus**: Extendido con `EVT_BUTTON` y payload `ButtonEventPayload`
- **Configuración**: 11 nuevas constantes en `config.example.h` (GPIO, timings, etc.)
- **Integración**: Nueva tarea `taskButton()` (prioridad 2, stack 12KB), registro en Health Monitor, inicialización en `main.ino`
- **Test**: Nuevo sketch `S3_test-button` con 7 pruebas de hardware (gestos, debounce, feedback LED)
- **Docs**: Actualizado `docs/user/manual.md` — nueva sección completa sobre Botón Multifunción, patrones LED, tabla de gestos, matriz de comportamiento por estado, procedimientos de Factory Reset y Provisioning, troubleshooting

**Resultado**: Implementación completa del botón multifunción con detección avanzada de gestos y mejor experiencia de usuario.

### Chore — Renombre firmware-esp32 → firmware

- Renombrado del directorio: `firmware-esp32/` → `firmware/`
- Cambio masivo y atómico en todo el monorepo
- Actualizadas todas las referencias (22 archivos, ~62 ocurrencias)
- Afectados: workspace pnpm, CI/CD, documentación, ADRs, scripts y configuraciones

**Archivos clave actualizados:**
- `.github/workflows/ci.yml`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- Múltiples ADRs y documentación de arquitectura
- Scripts internos y plantillas de GitHub

**Resultado**: Estructura más breve. El directorio `firmware/` ahora refleja mejor el nombre y facilita el mantenimiento.

### Backend — v0.17.2 — Estabilidad y Corrección de Errores

- **Server**: Agregados handlers globales de errores no capturados
  - `process.on('unhandledRejection')` y `process.on('uncaughtException')`
  - Errores ahora se loguean en lugar de matar silenciosamente el proceso
- **Middleware**: Protección de `checkDeviceAccess` contra errores de base de datos
  - Envolvido en `try/catch`
  - Evita `unhandled promise rejections` en las 11 rutas de dispositivos
  - Retorna error 500 controlado
- **Auth**: Protección del endpoint `GET /me`
  - Handler envuelto en `try/catch`
  - Evita crashes por errores en `User.findByPk()`
- **Telegram**: Prevención de crashes en `bot.sendMessage`
  - Añadido `.catch()` a las 8 llamadas del bot
  - Errores de Telegram (red, rate limit, etc.) ahora se loguean sin afectar el proceso
- **Chore — Dev Script**: Optimización para evitar reinicios innecesarios
  - Cambiado a `node --watch --watch-path=src src/server.js`
  - Ignora cambios en carpetas `logs/`, `node_modules`, etc.

**Resultado**: Backend significativamente más estable, con mejor manejo de errores inesperados y menor probabilidad de caídas silenciosas.

### Firmware (ESP32-S3) — v0.15.0 — Robustez

- HealthMonitor: heartbeat por tarea con enum `HeartbeatTaskId` (7 tareas)
- I2C bus recovery: pulso de 9 clocks en SCL + reinicio automático de Wire
- `loadRebootCount()`: solo incrementa en boots anormales (ST_ERROR, ST_RECOVERY, ST_OTA_UPDATING)
- OTA confirmation: `esp_ota_mark_app_valid_cancel_rollback()` en boot normal
- Separación de namespace NVS: SSR ahora usa `mush2_ssr`
- `millis()` → `esp_timer_get_time()` (64-bit) para `lastActuatorPersist`
- Actualizada `docs/roadmap.md` con Fase 7d completada

### Firmware (ESP32-S3) — v0.14.0 — Resiliencia y Arquitectura

**Nuevos Módulos:**
- `EventBus`: Sistema pub/sub thread-safe con FreeRTOS queue (10 tipos de evento)
- `Logger`: Multi-sink (Serial, SPIFFS con rotación, MQTT) + macros `LOG_*`
- `HealthMonitor`: 7ª tarea FreeRTOS con chequeos periódicos de heap, stack, I2C y sensores
- `TelemetryBuffer`: Buffer en RAM (200 entradas) + spill a SPIFFS con replay automático al reconectar

**Refactor y Mejoras:**
- Extracción completa de tareas a módulo `tasks.{h,cpp}` (`main.ino` reducido drásticamente)
- Mejoras en State Machine: transiciones PROVISIONING→WIFI y OTA_UPDATING→NORMAL
- Persistencia de estado y setpoints en NVS
- OTA: Implementada verificación **SHA-256** con mbedtls + refactor de acoplamiento

**Documentación:**
- ADR-012-FreeRTOS: Actualizado con 8 tareas y taskMonitor
- ADR-014-OTA-v3: Actualizado con SHA-256 y nuevo flujo
- ADR-016: Nuevo — Capability-based Subscription
- ADR-017: Nuevo — Event-Bus Architecture
- `firmware.md`: Nueva sección con estructura actual y 7 tareas

**Correcciones:**
- Bugs detectados durante refactor (printf, includes, nombres de instancias)

**Resultado**: Firmware más modular, observable y resiliente con mejor logging, monitoreo de salud y soporte offline.

### Frontend — v1.7.0 — Suscripciones y Rate Limiting

- **Nueva página**: `SubscriptionSettings`
  - Visualización del plan actual
  - Barra de uso
  - Opciones de upgrade y cancelación
- Enlace agregado en `SettingsNav`
- Nueva card en `SettingsHub`
- Ruta `/settings/subscription` configurada
- Nuevos métodos en `api/client.js` para manejar suscripciones

**Resultado**: Sistema completo de suscripciones con planes, rate limiting inteligente y gestión de retención de datos.

---

## 2026-07-11

### Backend — v0.16.1

- Instalada en todas las dependencias acordes crypto-js@^4.2.0
- Actualizado pnpm-lock.yaml en la raíz

### Backend — v0.16.0 — Seed de Ejemplo

- Usuarios: manager (ADMIN), tecno (OPERATOR), invitado (VIEWER) con contraseñas por defecto
- Cámaras: Configuración de 4 cámaras (Este, Oeste, Norte, Sur) con sus respectivos hongos
- Accesos: Matriz de permisos desde SUPER_ADMIN hasta VIEWER

**Resultado**: Inserción de 3 registros de ejemplo (login, device_register, recipe_create).

---

## 2026-07-10

### Backend — v0.15.0 — Telegram

- Nuevo modelo `TelegramDeviceConfig` — Configuración de alertas por dispositivo (`enabled`, tipos de alerta, `minSeverity`)
- Servicio `telegramService.js` — Bot polling con comandos `/link`, `/status`, `/unlink`
- Rutas `telegram.js` — Endpoints para link/unlink, status y CRUD de configuración por dispositivo
- Modelo `UserPreference` — Agregados campos `telegramLinkToken` y `telegramLinkTokenExpires`
- `server.js` — Inicialización del bot y escucha de eventos de alarma para notificaciones
- `client.js` — Añadidas 5 nuevas funciones API relacionadas con Telegram

### Frontend — v1.6.0 — Telegram

- `UserSettings` — Nueva sección Telegram con flujo de vinculación/desvinculación vía código
- `DeviceDetail` — Configuración de alertas Telegram por dispositivo

**Resultado**: Sistema completo de notificaciones Telegram tanto a nivel usuario como por dispositivo, con vinculación segura vía código y configuración granular de alertas.

### Backend — v0.14.1

- Optimizado el `ControlEngine` para registrar y persistir únicamente cambios reales en el estado de los actuadores
- Eliminado el logging repetitivo durante ciclos sin transiciones de estado
- Reducidas las escrituras innecesarias en la base de datos, actualizando los actuadores solo cuando su estado cambia efectivamente
- Mejorada la legibilidad de los registros del motor de control al eliminar eventos redundantes

### Firmware (ESP32-S3) — v0.13.0 — Actuator NVS

- Nuevo módulo `actuator_nvs` para guardar/cargar estados de actuadores en NVS (schema v1)
  - Guarda `desired[]` y `mode[]` para 4 actuadores
  - Guarda timestamp para control de expiración
- Nueva constante `ACTUATOR_HOLD_WINDOW_MS` (5 minutos por defecto)
- Flag `provisionalMode` para cuando no hay ciclo activo
- HTTP Poller ahora parsea `status`, `phase` y `setpoints` de la API
- HTTP Poller guarda automáticamente los estados en NVS después de cada poll exitoso
- MQTT ahora soporta setpoints en mensajes (nuevo struct `MqttActuatorMessage`)
- En `main.ino`: Se carga `HOLD_WINDOW` en `setup()`, los setpoints del HTTP poller se aplican y se chequea expiración, en callback MQTT se persisten setpoints y se usan defaults seguros si `no_active_cycle`
- **Fix OTA**: Ya no se sobrescribe la versión del firmware en post-boot
- **Fix OTA**: Se apagan todos los SSR antes de empezar el flashing

**Resultado**: Backend — correr migraciones para el nuevo índice; Firmware — actualizar todos los ESP32-S3 a esta versión.

### Backend — v0.13.0 — Diagnostics

- Nuevo `GET /api/diag/mqtt` — Estado detallado de brokers MQTT (primary/fallback), canales SSR y modo de control
- Nuevo `POST /api/diag/mqtt/publish` — Publicar mensaje de prueba (solo ADMIN)
- Nuevo `GET /api/events` — Eventos paginados con filtros (`type`, `deviceId`, `from`, `to`)
- Nuevo `GET /api/events/device/:deviceId` — Eventos específicos por dispositivo

### Frontend — v1.5.0 — Diagnostics

- Nueva página `/diagnostics`
- Paneles: MQTT Status, Chamber Control Mode, tabla de canales SSR, Publish Test
- Enlace a "Diag" agregado en Sidebar y BottomNav

**Resultado**: Módulo completo de diagnóstico para monitoreo en tiempo real de MQTT, estado de actuadores y registro de eventos del sistema.

### Backend — v0.12.0 — R4: Preferencias de Usuario + Configuración del Sistema

- Nuevo modelo `UserPreference` con campos: `theme`, `language`, `dateFormat`, `notificaciones`, `webhookUrl`, `minAlertSeverity`, campos legacy de R3 (`telegramEnabled`, `telegramChatId`) para compatibilidad
- Nuevo modelo `SystemSetting` tipo clave-valor con soporte para `type` (`string`/`number`/`boolean`/`json`)
- 29 valores por defecto en `systemSettingsDefaults.js` (instalación, timing, storage, environment, states, alarms, integration, ota)
- API: `/api/settings/profile` (GET/PATCH), `/api/settings/change-password`, `/api/settings/system` (GET/PATCH/seed), `/api/settings/system/public`

### Frontend — v1.4.0 — R4: Preferencias de Usuario + Configuración del Sistema

- Nueva página `UserSettings` con: perfil de usuario, preferencias personales, cambio de contraseña
- Nueva página `SystemSettings` con: editor agrupado por categorías, funciones de seed y restore
- `ThemeContext` ahora persiste el tema a través de la API del backend (ya no solo en localStorage)

**Resultado**: Implementación completa de R4 con preferencias de usuario y configuración avanzada del sistema, centralizando toda la configuración persistente en el backend.

### Backend — v0.11.0 — API Keys

- Nuevo modelo `ApiKey` con: `generateKey()` → clave raw con prefijo `mush_`, `hashKey()` → hash SHA-256 para almacenamiento seguro
- Auth: Middleware `auth.js` actualizado con autenticación **dual** (JWT prioritario, X-API-Key fallback)
- Seguridad: Soporte de IP whitelist, expiración de keys, rate limiting, tracking de auth failures
- API: CRUD completo en `/api/api-keys` — Listar (paginado), Crear (devuelve la clave raw solo una vez), Actualizar, Revocar (soft delete), Rotar

### Frontend — v1.3.0 — API Keys

- Nueva página `/settings/api-keys`
- Tabla de claves con paginación
- Modal para copiar clave al crear o rotar
- Entrada en `SettingsNav`
- Nueva card en `SettingsHub`

**Resultado**: Sistema completo y seguro de API Keys para integración multi-dispositivo y clientes externos, con excelente experiencia de usuario en el frontend.

---

## 2026-07-09

### Backend — v0.10.0 — Device Management & Monitoring

- Nuevo campo `hwRevision: STRING(10)` en modelo `Device`
- `firmwareVersion` ampliado a `STRING(20)` para soportar SemVer
- Nuevo campo `deviceId: INTEGER` con FK a `Device` en `CultivationCycle`
- Añadidas asociaciones: `Device.hasMany(CultivationCycle)` y `CultivationCycle.belongsTo(Device)`
- Búsqueda prioritaria por `cycle.deviceId` con fallback a `chamberId`
- Mejorado registro y reclamación de dispositivos con `UserChamberAccess`
  - `POST /api/devices` crea automáticamente registro con rol `OWNER`
  - Nuevo endpoint `POST /api/devices/:id/claim`
  - Mejorado flujo de `POST /api/devices/register`
- Script de backfill: `backfill-user-chamber-access.js` para dispositivos existentes
- Validaciones mejoradas en creación de ciclos (recipeId, species, deviceId)
- `server.js`: `sequelize.sync({ alter: true })` en desarrollo
- Nuevo script `backend/src/sync-db.js` para sincronización manual
- Mejoras en `POST /devices/register`, claim y PATCH para persistir `hwRevision`
- Seed: 7 recetas adicionales (Pearl Oyster, Pink Oyster, Shiitake, Lion's Mane, Reishi, Cordyceps, Turkey Tail)

**Resultado**: Base de datos más robusta, asociaciones claras entre dispositivos y ciclos, y mejor soporte para registro/reclamación de hardware.

### Frontend — v1.3.0 — Settings Panel

- `Settings.jsx` convertido en layout con rutas anidadas + `SettingsNav`
- Implementadas páginas dedicadas: `DeviceSettings`, `CultivationSettings`, `SystemSettings`, `UserSettings` y `SettingsHub`
- Sistema global de tema claro/oscuro con `ThemeContext`
- Flujo completo de **2FA** en `UserSettings`
- Reorganización de secciones y limpieza visual
- Eliminados todos los mocks en Settings
- Añadidos métodos: `getSystemMetrics()`, `updateProfile()`, `updateDevice()`, `claimDevice()`
- `StatusFooter` ahora muestra versión real del sistema
- Fix global de color de texto en inputs para tema oscuro
- `Landing.jsx`: Eliminados elementos decorativos (partículas, micelio, parallax, stats falsos)
- `Dashboard`, `DeviceDetail`, `Cycles` y `Recipes`: Eliminados datos hardcodeados y componentes sci-fi
- `Home.jsx` reemplazado por redirección a `/dashboard`
- Terminología estandarizada (sci-fi → técnica)
- Fixes menores: key en logs, React Router v7 flags, navegación en TopBar

**Resultado**: Frontend mucho más limpio, profesional y completamente conectado al backend.

### Firmware (ESP32-S3) — v0.12.0 — MQTT Registration

- Mejora en flujo de registro y status MQTT
  - Al recibir status se actualiza/inserta dispositivo con datos reales
  - Segunda oportunidad de registro si HTTP falla
- Variables compartidas: `sharedMac`, `sharedFwVer`, `sharedHwRev`
- `publishStatus()` ahora incluye `macAddress`, `firmwareVersion` y `hwRevision`
- `registerDevice()` envía `hwRevision`
- BLE Provisioning soporta `HW_REVISION` configurable

---

## 2026-07-08

### Frontend — v1.1.3 — React Router v7 Prep

- Añadido prop `future` a `<BrowserRouter>` en `App.jsx`
- Activados: `v7_startTransition` y `v7_relativeSplatPath`
- Silenciados los warnings de deprecación del inspector de React Router
- Preparación anticipada para la migración a **React Router v7**

**Resultado**: Código futuro-compatible y sin warnings de deprecación.

### Frontend — v1.1.2 — Fixes React + Gauge Consistency

- **Bug fix**: Añadido `key={i}` en el `.map()` de logs (línea 348) — Eliminado warning de React: *"Each child in a list should have a unique key"*, build limpio (0 warnings)
- **Corrección**: Solucionada referencia a `GREEN` en la rama fallback del operador ternario (línea 68) — Ahora usa `GAUGE_COLORS.green` de forma consistente, gradient recibe correctamente el array `[{ offset: 0, color: GAUGE_COLORS.green }, ...]`

**Resultado**: Eliminación completa de warnings en build y mayor consistencia en el manejo de colores del sistema de gauges.

### Frontend — v1.1.1 — CSS + Design System Cleanup

- **Corrección**: `var(--primary)` inexistente en `focus-visible` → reemplazado por `--spore-green`
- **Refactor**: Reemplazado toggle local en `ActuatorControl` por import desde `ui/`
  - Mayor consistencia con el Design System
- **Limpieza**:
  - Resuelto warning de estilo duplicado preexistente
  - Eliminado `dashboard/MetricCard.jsx` (código muerto, no era importado)
  - Convertidos más de 30 estilos inline a 20 clases CSS dedicadas
  - Eliminadas definiciones duplicadas de `scrollbar` y `shimmer`
  - Migrados colores a variables `--gauge-*`
  - Lectura de colores vía `getComputedStyle()` para mayor flexibilidad

**Resultado**: Código más limpio, mantenible y coherente con el Design System. Reducción significativa de estilos inline y eliminación de código muerto.

---

## 2026-07-07

### Backend — v0.9.0 — BLE Provisioning + SSR Config

- **POST /devices/register** (público): crea dispositivo sin `userId` si no existe (soporte inicial de provisioning)
- **PATCH /devices/:id** (autenticado): permite actualizar `ssrActiveLow` y asignar `userId`
- Mejorado `findOrCreate` para el flujo completo de provisioning BLE
- Devuelve `ssrActiveLow` en el endpoint de polling `GET /`
- Soporte para que el firmware sincronice la configuración de polaridad desde el backend
- Nuevo campo `ssrActiveLow`: BOOLEAN, default: `true`
- Permite configurar polaridad de los SSR (active-LOW / active-HIGH) por dispositivo

**Resultado**: Backend ahora soporta completamente el flujo de provisioning BLE + configuración dinámica de polaridad SSR por dispositivo, con endpoints más flexibles y seguros.

### Frontend — v1.1.0 — SSR Configuration

- **Provisioning.jsx**: toggle de modo SSR + claim device (asignación de `userId`)
- **DeviceDetail.jsx**: nuevo panel **SSR CONFIGURATION** con toggle persistente
- Corregido control de actuadores en dispositivos nuevos (integración con `findOrCreate` del backend)
- Mejora general en UX de configuración de polaridad SSR

**Resultado**: La interfaz ahora ofrece una experiencia de provisioning y configuración de hardware (SSR) mucho más intuitiva y robusta, corrigiendo problemas en dispositivos recién registrados y asegurando un canal para añadir dispositivos.

### Firmware (ESP32-S3) — v0.11.0 — SSR Polaridad + BLE

- Soporte completo para `SSR_ACTIVE_LOW` y constantes BLE
- Mantiene sincronización entre `config.example.h` y el script de generación de configuración
- `SSR_ACTIVE_LOW` ahora es configurable en runtime vía NVS
- Nueva characteristic BLE: **SSR_MODE**
- `http_poller` sincroniza valor de polaridad desde el backend
- Persistencia y aplicación dinámica de la polaridad SSR
- Agrega y documenta `SSR_ACTIVE_LOW` (default: `true`)
- Agrega constantes BLE (`BLE_PROV_TIMEOUT_MS`, `BLE_DEVICE_NAME_PREFIX`, etc.)
- Mejora significativa de comentarios y estructura del template de configuración
- Crea servicio GATT con 6 characteristics: `DEVICE_INFO`, `WIFI_SSID`, `WIFI_PASS`, `PROV_CMD`, `PROV_STATUS`, `SSR_MODE`
- Soporta comandos: `provision`, `reset`, `factory_reset`
- Advertising name: `Mush2-{last4MAC}`
- Persistencia en NVS (`mush2_prov` namespace)
- LED pulsing durante modo provisioning
- Registro automático del dispositivo vía `HTTP POST /devices/register`

**Resultado**: Firmware ahora es mucho más configurable y mantenible, con sincronización bidireccional de polaridad SSR, mejor experiencia de provisioning BLE y código más limpio y documentado.

### Docs — v0.9.0 — Auditoría & Reestructuración

- Reestructuración completa de directorios: Implementada la nueva taxonomía definida en `ADR-015`
- Nuevo `docs/README.md` — Índice navegable maestro del proyecto para colaboradores humanos y agentes de IA
- Nuevo `design/components.md` — Catálogo completo de componentes organizados por capas
- Nuevo `design/design-tokens.md` — Sistema de tokens centralizado
- Nuevo carpeta `docs/edd/` (Engineering Design Documents) con template y los siguientes documentos:
  - `EDD-001-sistema-control-ambiental.md` (Visión completa del sistema)
  - `EDD-002-motor-reglas-recetas.md` (Motor de reglas e histéresis)
  - `EDD-003-ota-v3-canary-deployment.md` (Estrategia de actualizaciones en 4 capas)
  - `EDD-004-estrategia-multitenant.md` (Aislamiento de datos y escalabilidad)
- Nuevo carpeta `docs/rfc/` (Request for Comments) con template y propuestas iniciales en estado DRAFT:
  - `RFC-0001-template.md` (Plantilla estándar)
  - `RFC-0002-https-tls-firmware.md` (Migración a HTTPS/TLS en firmware)
  - `RFC-0003-mqtt-v2-upgrade.md` (Broker propio + TLS + ACL)
  - `RFC-0004-multi-device-dashboard.md` (Dashboard multi-dispositivo)
  - `RFC-0005-notificaciones-push.md` (Alertas vía Telegram/Email)
- Nuevo `docs/ADR/ADR-015-docs-restructure.md` — Registro formal de la decisión arquitectónica de esta reestructuración
- Consolidación: Unificación de todos los roadmaps en un único archivo autoritativo `docs/roadmap/roadmap.md`. Versiones antiguas archivadas en `docs/roadmap/archive/`
- Limpieza y movimientos:
  - Eliminado `docs/firmware.md` (duplicado obsoleto)
  - Reescrito completamente `docs/architecture/firmware.md` con el estado actual (ESP32-S3 + FreeRTOS + 6 tareas + HTTP Polling)
  - Movido `docs/database.md` → `docs/architecture/database.md`
  - Movido `docs/ui-standards.md` → `docs/design/ui-standards.md`
  - Movido `docs/deployment.md` → `docs/operations/deployment.md`
  - Movido `docs/operations.md` → `docs/operations/runbook.md`
  - Eliminadas carpetas obsoletas `docs/context/` y `docs/issues/`
  - Expandido `docs/governance/decision-tree.md` con lineamientos de gobernanza, protocolos y control de fallos
  - Creado `docs/diagrams/exports/README.md` con instrucciones de exportación de diagramas `.drawio`

**Resultado**: La documentación técnica ahora está limpia, modular, profesional y preparada para la colaboración tanto humana como con agentes de inteligencia artificial.

---

## 2026-07-06

### Frontend — v1.0.3 — Visual Improvements

- **Mejora visual**: Matriz de Control de Actuadores (`ActuatorControl.jsx`)
  - Aumentado padding del contenedor principal de `12px` → `16px`
  - Iconos de actuadores: `fontSize` de `14px` → `28px`
  - Etiquetas de título: `fontSize` de `7px` → `10px`
  - Interruptor personalizado (Toggle): wrapper expandido de `22px × 12px` → `32px × 18px`
  - Botón del interruptor: de `7px × 7px` → `12px × 12px` (centrado correctamente)
  - Etiquetas de estado y modo: `fontSize` aumentado a `8px` y `9px`
  - Texto grande de estado: `fontSize` de `14px` → `22px`
  - Espaciado entre elementos mejorado (`gap` de `8px`/`10px`)
- **Mejora visual**: Gráficos de Historial (`ChartPanel.jsx`)
  - Botones de rango de tiempo en sidebar: texto de `7px` → `10px`, padding mejorado
  - Ancho de columna del sidebar: `36px` → `48px` (evita recorte de texto)
  - Leyenda: puntos de `6px × 6px` → `10px × 10px`, texto de `7px` → `10px`
  - Leyenda en footer: texto de `7px` → `10px`, líneas de `10px × 2px` → `14px × 4px`
  - Bandas de referencia: aumentada opacidad de fondo de las bandas de Temperatura y Humedad (`0.15` fill, `0.4` stroke) para mayor visibilidad
  - Nueva funcionalidad: Toggle de visibilidad de líneas
    - Estado `visibleLines` en React para controlar líneas activas
    - Click en badges de la leyenda para activar/desactivar líneas
    - Badges atenuados (`opacity: 0.35`) cuando están inactivos
    - `computeRanges` actualizado para ignorar líneas ocultas y reajustar automáticamente el eje Y
    - Plugin de bandas de referencia ahora solo dibuja las bandas de las líneas activas

**Verificación**: Compilación de producción exitosa (`pnpm build`) sin errores ni warnings.

**Resultado**: Dashboard significativamente más legible, con mejor jerarquía visual, controles más grandes y funcionales, y gráficos más claros e interactivos.

### Frontend — v1.0.2 — BLE Provisioning Wizard

- Nuevo botón **ADD DEVICE** en el header del Dashboard
- `DevicesEmptyState` ahora redirige al flujo de provisioning con botón principal destacado
- Eliminado enlace directo a provisioning del Sidebar (mejor UX centralizada)
- Nueva ruta `/provisioning` agregada al `BrowserRouter`
- Wizard completo de aprovisionamiento BLE (4 pasos): Escanear dispositivos, Configurar credenciales WiFi, Enviar datos vía Web Bluetooth, Estado final (Listo / Error)
- Manejo completo de estados, conexión BLE, envío de credenciales y feedback visual en tiempo real
- Integración fluida con el flujo de provisioning del firmware

**Resultado**: Flujo de onboarding de nuevos dispositivos mucho más intuitivo y centrado en el usuario.

### Backend — v0.8.1 — Device Registration

- Nuevo endpoint: `POST /api/v1/devices/register`
- Endpoint público (sin autenticación JWT) diseñado para que el firmware se autoregistre automáticamente tras completar el provisioning BLE
- Permite el registro del dispositivo con: MAC Address, `deviceId`, información de hardware (modelo, versión de firmware, etc.), datos adicionales de aprovisionamiento

**Propósito**: Soporte completo al flujo de aprovisionamiento BLE → registro automático en backend sin intervención manual.

### Firmware (ESP32-S3) — v0.10.0 — BLE Provisioning

- Nuevo `BLEProvisioning` — Servidor GATT completo con 5 characteristics (`device_info`, `wifi_ssid`, `wifi_pass`, `prov_cmd`, `prov_status`)
- Nuevo: Persistencia en NVS (`namespace: mush2_prov`)
- Nuevo: Callbacks para `provision`, `reset` y `factory_reset`
- Configuración: Agregados flags: `CONFIG_BT_ENABLED=1`, `CONFIG_BT_BLE_ENABLED=1`, `CONFIG_BT_NIMBLE_ENABLED=1` — Soporte BLE habilitado en ambos entornos (dev + producción)
- State Machine: Nuevo estado `ST_PROVISIONING` (índice 9), matriz de transiciones expandida a 10×10, soporte completo para modo provisioning
- Configuración: Nuevos defines: `BLE_PROV_TIMEOUT_MS` y `BLE_DEVICE_NAME_PREFIX` con valores por defecto
- `setProvisionedCredentials()` para cargar credenciales desde NVS
- Soporte mejorado para `String` en lugar de `const char*`
- Integración fluida con el flujo completo de BLE provisioning
- En `setup()`: Si no hay credenciales → entra en modo provisioning (BLE + tarea idle); Si hay credenciales → modo normal (WiFi + MQTT + sensores)
- Integración completa del flujo BLE

**Resultado**: El dispositivo ahora puede ser aprovisionado de forma inalámbrica vía BLE sin necesidad de cables ni configuración previa por USB/Serial.

### Docs — v0.1.0 — Reestructuración Inicial

- Reestructuración de Directorios: Se implementó la taxonomía definida en `ADR-015`
- Nuevo `docs/README.md` — Índice navegable maestro del proyecto para colaboradores y agentes de IA
- Nuevo carpeta `docs/edd/` (Engineering Design Documents) con template y diseño de:
  - `EDD-001-sistema-control-ambiental.md` (Sistema completo)
  - `EDD-002-motor-reglas-recetas.md` (Motor de reglas)
  - `EDD-003-ota-v3-canary-deployment.md` (OTA v3 4-capas)
  - `EDD-004-estrategia-multitenant.md` (Aislamiento de datos y escalabilidad)
- Nuevo carpeta `docs/rfc/` (Request for Comments) con template y propuestas iniciales en DRAFT:
  - `RFC-template.md` (Plantilla de propuesta)
  - `RFC-0001-https-tls-firmware.md` (Migración HTTPS/TLS en firmware)
  - `RFC-0002-mqtt-v2-upgrade.md` (Broker propio + TLS + autenticación ACL)
  - `RFC-0003-multi-device-dashboard.md` (Dashboard multi-dispositivo simultáneo)
  - `RFC-0004-notificaciones-push.md` (Alertas Telegram/Email)
- Nuevo `docs/ADR/ADR-015-docs-restructure.md` — Registro de decisión arquitectónica de esta reestructuración
- Consolidación: Unificación de roadmaps (`roadmap.md`, `roadmap-frontend.md`, `roadmap-consolidacion.md`, `roadmap-ota.md`) en un único `docs/roadmap/roadmap.md` autoritativo. Archivos antiguos movidos a `docs/roadmap/archive/`
- Mantenimiento: Eliminado `docs/firmware.md` (duplicado obsoleto), Actualizado `docs/architecture/firmware.md` para reflejar el estado actual del firmware (ESP32-S3 + FreeRTOS + HTTP Polling), Movido `docs/database.md` → `docs/architecture/database.md`, Movido `docs/ui-standards.md` → `docs/design/ui-standards.md`, Movido `docs/deployment.md` → `docs/operations/deployment.md`, Movido `docs/operations.md` → `docs/operations/runbook.md`, Eliminada carpeta obsoleta `docs/context/` y `docs/issues/`, Expandido `docs/governance/decision-tree.md` con lineamientos de gobernanza, protocolo y control, Creado `docs/diagrams/exports/README.md` con instrucciones de exportación de archivos `.drawio`

---

## 2026-07-04

### Frontend — v1.0.2 — CSS Puro + Design System

- **Refactorización completa**: Se migró a un sistema de diseño basado en **CSS Variables** + utilidades propias, desarrollando un estilo bioluminiscente del prototipo
- Nuevo: Sistema de Design Tokens en `:root` (`--spore-green`, `--teal`, `--surface-container`, `--on-surface`, etc.)
- Nuevos componentes de layout: `AppShell`, `Sidebar`, `TopBar`, `StatusFooter` y `BottomNav` (responsive)
- Nuevos componentes UI: `DomeGauge`, `ChartPanel`, `MetricCard`, `StatusBadge`, `TerminalLog`, `ToggleSwitch`, `EmptyState`, `ErrorState`, `OfflineBanner`, `LoadingState`
- Nuevo `AuthModal` y `Landing` page con parallax, breathing nodes, red de micelio SVG y partículas animadas
- Nuevo `DeviceDetail` completamente rediseñado con gauges tipo domo, gráficos de historial, System Log en vivo y Actuator Matrix
- Mejora: Unificación de botones (`.btn-primary`, `.btn-danger`, `.btn-ghost`, etc.) y formularios
- Mejora: Animaciones y efectos (pulse-glow, breathe, slideUp, glassmorphism) consistentes con el prototipo
- Limpieza: Eliminación de clases Tailwind inexistentes, estilos inline redundantes y configuración de Tailwind
- Optimización: Mejor balance de altura entre secciones (gauges vs System Log) y responsividad móvil

**Resultado**: Frontend ahora es más ligero, mantenible y fiel al diseño original del prototipo sin dependencias innecesarias.

### Firmware (ESP32-S3) — v0.9.3

- Test of operativity — Successful

### Firmware (ESP32-S3) — v0.9.2

- Update stable actuator version

---

## [0.9.1] — 2026-06-29 — OTA v3 + HTTP Poller fixes

### Docs — v0.9.1

- `ADR-014-OTA-v3.md`: Estado **Propuesto → Implementado**. Sección de implementación agregada con archivos creados, flujo completo, MQTT integrado, fixes aplicados y comprobación en hardware

### Firmware (ESP32-S3) — OTA v3

- Nuevo `ota_nvs.{h,cpp}` — Inicialización NVS con esquema v1, key `fw_version`
- Nuevo `ota_decisor.{h,cpp}` — `OTASelector` con validación URL, SemVer, RSSI
- Nuevo `ota_shutdown.{h,cpp}` — `OTAShutdown` para apagado seguro SSR/sensores/comms
- Nuevo `ota_executor.{h,cpp}` — `OTAExecutor` con descarga HTTPS vía `Update.write()`
- Nuevo `ota_postboot.{h,cpp}` — `OTAConfirmation` con self-test + confirmación MQTT
- Nuevo `mqtt_client.{h,cpp}` — Cliente MQTT PubSubClient, tarea FreeRTOS dedicada
- Nuevo `partitions.csv` — OTA dual 8MB (app0/app1, spiffs 1.5MB, coredump)
- Nuevo `state_machine.{h,cpp}` — Matriz 9×9 con `fsmTransition()`
- Integración MQTT: Subscribe a `mush2/{deviceId}/ota/command`, publica `ota/rejected` y `ota/status` con retain
- Limpieza: Eliminados `startArduinoOTA()`, `startHTTPUpdate()`, `isUpdating()` de `ota_handler`
- `getVersion()` ahora lee de NVS con fallback a `FIRMWARE_VERSION="0.9.0"`
- `nvsSetFwVer(cand.version)` post-ejecución exitosa

### Firmware (ESP32-S3) — HTTP Poller fixes

- **Bug fix**: Stack overflow silencioso mataba el poller HTTP → `STACK_POLLER 4096→8192`
- **Bug fix**: `client.connect()` sin timeout bloqueaba hasta ~20s → `client.connect(host,port,5000)`
- **Bug fix**: `client.printf()` sin flush no enviaba datos al wire → `client.flush()` post-printf
- **Bug fix**: `Transfer-Encoding: chunked` no manejado → de-chunking en `runParse()`
- **Bug fix**: `continue` en `taskOTA()` saltaba `vTaskDelayUntil` → reemplazado por `goto ota_skip`
- Mejora: `DELAY_POLLER 100→500ms`, `DELAY_MQTT 50→500ms` para reducir CPU waste
- Mejora: `vTaskDelay(50)` tras connect para estabilizar TCP
- `BACKEND_PORT` corregido de 3000→3797 para coincidir con backend Express

### Docs — v0.9.1 — OTA v3 Documentation

- `README.md`: Referencia a ADR-014 agregada
- `docs/ADR/ADR-014-OTA-v3.md`: Implementación completa documentada (archivos, flujo, fixes, comprobación)
- `docs/issues/ota-v3/`: Estados de fases actualizados a completado

---

## [0.9.0] — 2026-06-28 — Arquitectura FreeRTOS + Estrategia de Seguridad

### Docs — v0.9.0

- ADR-012-FreeRTOS: Arquitectura formal de tareas FreeRTOS, sincronización con colas (cmdQueue, sensorDataQueue), sistema de watchdog jerárquico unificado (TWDT + SWDT + Health Check) y roadmap de refactorización en 4 fases
- ADR-013-Seguridad-Estrategia: Estrategia de seguridad por capas con 8 dominios (secretos, transporte, autenticación de dispositivos, hardening firmware, backend, frontend, auditoría, supply chain). Roadmap en 5 fases

### Firmware (ESP32-S3) — v0.9.0

- 6 tareas FreeRTOS documentadas formalmente con prioridades, stacks y delays
- Watchdog documentado como sistema de 3 niveles

### Backend — v0.9.0

- Version bump: 0.8.0 → 0.9.0

### Frontend — v0.9.0

- Version bump: 0.8.0 → 0.9.0

### Docs — v0.9.0 — Architecture Updates

- `README.md`: Actualizado a v0.9.0 con referencias a ADR-012, ADR-013, stack FreeRTOS, arquitectura de seguridad
- `docs/architecture/architecture.md`: Diagrama actualizado con FreeRTOS, SSR 4 canales, watchdog jerárquico; sección de seguridad actualizada por ADR-013
- `docs/architecture/backend.md`: Versión 0.9.0, servicios actualizados (mqttBridge, webSocketServer), modelo ApiKey
- `docs/architecture/firmware.md`: Reescrito completo: 6 tareas FreeRTOS, pinout real de config.h, watchdog jerárquico, sincronización con colas, ciclo principal FreeRTOS
- `docs/architecture/frontend.md`: Version bump, flujo auth con httpOnly cookie (ADR-013)
- `docs/roadmap.md`: Fase 0 actualizada con ADR-001 a ADR-013; fase 14 actualizada; v0.9.0 como versión actual
- `docs/roadmap/milestone.md`: Referencias a ADRs actualizadas, v0.9.0
- `docs/roadmap/otras-consideraciones.md`: Items vinculados a fases correctas del roadmap
- `docs/requirements.md`: Requisitos actualizados con FreeRTOS, watchdog jerárquico, NVS, Secure Boot
- `docs/database.md`: Modelo ApiKey integrado en relaciones, PostgreSQL 16
- `docs/deployment.md`: Notas de seguridad (NVS, generate_config.py), HTTPS
- `docs/operations.md`: Version bump, security maintenance actualizado
- `docs/scalability.md`: Version bump
- `docs/firmware.md`: Actualizado con FreeRTOS, tareas, watchdog jerárquico, pinout correcto

---

## [0.8.1] — 2026-06-27 — Fix Stack Overflow + LAN Connectivity

### Firmware (ESP32-S3)

- **Bug fix crítico**: Stack canary overflow (`Guru Meditation: Stack canary watchpoint triggered`) causado por `WiFiClientSecure` (mbedTLS) al intentar TLS. El TLS handshake requería ~80 KB de stack; la tarea HTTP tenía insuficientes 48 KB (12288 words)
- `config.h`: `STACK_HTTP` aumentado de 12288 → 20480 words (~80 KB) como medida defensiva
- `config.h`: Nuevo flag `HTTP_DISABLE_TLS` para compilación sin TLS (LAN local)
- `config.h`: Backend apuntado a IP LAN del PC (`192.168.1.6:3797`)
- `http_handler.h`: Cliente HTTP polling con compilación condicional para TLS
- `http_handler.cpp`: Eliminado reintento automático PLAIN→TLS que causaba el reboot loop. La lógica de fallback ahora rota solo entre endpoints. `BACKOFF_MAX` reducido de 180s → 60s (LAN no necesita backoff largo)
- `http_handler.cpp`: Pre-resolución DNS inteligente: si `API_HOST` es una IP literal, no llama a resolución DNS (ahorra ~12s de bloqueo por boot)

### Infraestructura

- Eliminada dependencia de Mosquitto/HiveMQ; la comunicación ahora es HTTP directo al backend

### Backend

- `.env`: `API_HOST` configurado como `localhost`
- `.env`: `DEVICE_ID` configurado como `mush2_A0F262E55CBC` (MAC del ESP32-S3)

---

## [0.8.0] — 2026-06-24 — Fase 8 (Multi-Cámara)

### Firmware

- `DeviceManager`: deviceId dinámico derivado de MAC address, persistido en EEPROM al primer boot
- Eliminado `DEVICE_ID` hardcoded de `config.h` — ahora cada nodo tiene identidad única
- Todos los mensajes HTTP usan el deviceId real (MAC) en payloads

### Backend

- Auto-registro universal de nodos: todos los handlers HTTP (`handleOnline`, `handleAck`, `handleDeviceState`) ahora crean el dispositivo si no existe via `findOrCreate`

### Frontend

- Dashboard multi-cámara con selector de dispositivo activo
- Fila de promedios agregados (T°/HR) cuando hay 2+ cámaras
- SSE filtrado por dispositivo seleccionado
- `chamberName` visible en tarjetas de dispositivo

### Docs

- `docs/roadmap.md` extendido a 18 fases (F15-F18: Gemelo Digital, Marketplace, App Móvil, Certificación)
- `docs/roadmap/milestone.md` actualizado con M8-M10 planificados
- `docs/roadmap/otras-consideraciones.md` reestructurado como backlog técnico
- `docs/roadmap/consideraciones.md` y `roadmap-v2.md` archivados (contenido integrado)

---

## [0.7.0] — 2026-06-12 — Fase 7 (Producción)

### Firmware

- OTA: ArduinoOTA para actualización local + HTTP Update remoto
- Endpoint HTTP `POST /api/v1/devices/{id}/ota` con acciones `activate` (modo OTA) y `update` (HTTP update)
- Versionado del firmware expuesto vía `getVersion()`

### Backend

- `/api/v1/monitoring/metrics` endpoint con estadísticas del sistema
- `/api/v1/health/db` y `/health/backend` health checks específicos
- Script `src/scripts/backup-db.js` para backup programado de PostgreSQL
- Dependencia: `pg_dump` para backups

### CI/CD (GitHub Actions)

- Workflow `ci.yml` con 3 jobs paralelos: firmware build, backend test, frontend build
- Backend test con servicio PostgreSQL 18
- Frontend build con Node 24 + pnpm
- Trigger en push/PR a main y develop, y en releases

### Docs

- Manual de usuario completo en `docs/user/manual.md` (español)
- Cubre: arquitectura, conexión inicial, dashboard, dispositivos, recetas, ciclos, planes, troubleshooting

---

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

---

## [0.5.0] — 2026-06-12 — Fase 5 (Hardening)

### Firmware

- Máquina de estados: BOOT → INIT → WIFI → NORMAL → DEGRADED → ERROR → RECOVERY → SAFE
- Watchdog hardware 8s + software 30s con feed en cada loop
- EEPROM: contador de reinicios, modo SAFE tras 5 reinicios consecutivos
- HTTP: exponential backoff (5s – 180s) + keep-alive
- Fallback automático a modo LOCAL sin conexión WiFi/HTTP

### Backend

- Autenticación JWT: login/refresh/logout + token rotation
- RBAC: SUPER_ADMIN, ADMIN, OPERATOR, VIEWER con jerarquía de roles
- Rate limiting: 100 req/15min en `/api/*`
- Helmet CSP + CORS hardening
- Cifrado AES-256-GCM para claves ThingSpeak
- Audit logging de operaciones sensibles
- HTTP: exponential backoff + alarm dedup backend-side
- Pruebas unitarias: Jest + Supertest configurados
- Seed: usuario admin (SUPER_ADMIN) creado automáticamente

### Frontend

- ErrorBoundary global con recarga
- Skeleton loading para métricas/tarjetas/tablas
- AuthContext para manejo de tokens JWT
- Diseño responsive (768px + 480px breakpoints)

---

## [0.4.0] — 2026-06-12 — Fase 4

### Firmware

- `hysteresis_controller`: reglas locales con histéresis (temp, hum, CO2)
- SSR1 = calefacción (temp), SSR2 = ventilación (temp+CO2), SSR3 = humidificación (hum)
- Modos LOCAL (reglas), REMOTE (comandos HTTP), OFF
- Endpoint HTTP `POST /api/v1/devices/{id}/config` para setpoints remotos
- Alarmas automáticas reportadas vía HTTP polling (HIGH_TEMP, LOW_TEMP, HIGH_HUM, etc.)
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

---

## [0.3.0] — 2026-06-12 — Fase 3

### Firmware

- `ens160_sensor`: driver ENS160 (I2C 0x53), AQI/eCO₂/TVOC
- Calibración del ENS160 con temperatura/humedad del AHT21
- CO₂ y VOC incluidos en telemetría HTTP
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

---

## [0.2.0] — 2026-06-12 — Fase 2

### Firmware

- `ssr_controller`: 3 canales SSR, minOn/maxOn timers, safety limits
- Endpoint HTTP `POST /api/v1/devices/{id}/actuator` con parseo JSON
- ACK automático en respuesta HTTP
- Estado periódico de actuadores en payload de telemetría
- Dependencia añadida: ArduinoJson 7

### Backend

- Modelo `Actuator` (deviceId, channel, state, mode, lastCommand, lastAck)
- `GET /api/v1/devices/:id/actuators`
- `PATCH /api/v1/devices/:id/actuators/:channel` → envía comando HTTP
- Manejo de ACK: actualiza DB, emite SSE
- SSE endpoint `GET /events` (eventos ack, state, telemetry)
- Fix: path de `.env` corregido

### Frontend

- Página `DeviceDetail` con métricas en tiempo real + controles de actuador
- Componente `ActuatorControl` (toggle ON/OFF por canal SSR)
- Hook `useSSE` para eventos en tiempo real vía EventSource
- Routing con React Router (Dashboard → DeviceDetail)
- Dashboard linkea a detalle de dispositivo

---

## [0.1.0] — 2026-06-12 — Fase 1

### Backend

- Setup Express 5 + Sequelize 6 + PostgreSQL
- Modelos: Device, Sensor, Telemetry, Event
- Cliente HTTP polling con failover entre 2 endpoints
- API REST: listar dispositivos, telemetría, health check
- Persistencia automática de telemetría entrante

### Frontend

- Setup Vite + React 18 + React Router
- Dashboard con MetricCards (temp, hum, CO2, VOC)
- Polling automático cada 10s
- Proxy API Vite → Backend

### Firmware

- Setup PlatformIO (ESP32-S3)
- WiFi manager: 2 redes con failover
- Driver AHT21 (I2C 0x38) — temperatura y humedad
- HTTP handler: publicación telemetría, boot event, online status
- ThingSpeak client: envío HTTP de respaldo
- `generate_config.py`: genera `config.h` desde `.env`
