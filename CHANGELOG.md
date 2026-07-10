# Changelog — Mush2

## 2026-07-10

### Backend & Frontend — API Keys (v0.11.0 / v1.3.0)

### Backend

- **Nuevo**: Modelo `ApiKey` con:
  - `generateKey()` → clave raw con prefijo `mush_`
  - `hashKey()` → hash SHA-256 para almacenamiento seguro
- **Auth**:
  - Middleware `auth.js` actualizado con autenticación **dual**:
    - JWT (prioridad)
    - X-API-Key (fallback)
- **Seguridad**:
  - Soporte de IP whitelist
  - Expiración de keys
  - Rate limiting
  - Tracking de auth failures
- **API**:
  - CRUD completo en `/api/api-keys`:
    - Listar (paginado)
    - Crear (devuelve la clave raw solo una vez)
    - Actualizar
    - Revocar (soft delete)
    - Rotar

### Frontend

- **Nuevo**: Página `/settings/api-keys`
  - Tabla de claves con paginación
  - Modal para copiar clave al crear o rotar
- **UI**:
  - Entrada en `SettingsNav`
  - Nueva card en `SettingsHub`

**Resultado**: Sistema completo y seguro de API Keys para integración multi-dispositivo y clientes externos, con excelente experiencia de usuario en el frontend.

## 2026-07-09

### Backend — v0.10.0

#### Database & Models
- Nuevo campo `hwRevision: STRING(10)` en modelo `Device`
- `firmwareVersion` ampliado a `STRING(20)` para soportar SemVer
- Nuevo campo `deviceId: INTEGER` con FK a `Device` en `CultivationCycle`
- Añadidas asociaciones: `Device.hasMany(CultivationCycle)` y `CultivationCycle.belongsTo(Device)`
- Búsqueda prioritaria por `cycle.deviceId` con fallback a `chamberId`

#### Auth & Devices
- Mejorado registro y reclamación de dispositivos con `UserChamberAccess`
  - `POST /api/devices` crea automáticamente registro con rol `OWNER`
  - Nuevo endpoint `POST /api/devices/:id/claim`
  - Mejorado flujo de `POST /api/devices/register`
- Script de backfill: `backfill-user-chamber-access.js` para dispositivos existentes
- Validaciones mejoradas en creación de ciclos (recipeId, species, deviceId)

#### Monitoring & Sync
- `server.js`: `sequelize.sync({ alter: true })` en desarrollo
- Nuevo script `backend/src/sync-db.js` para sincronización manual
- Mejoras en `POST /devices/register`, claim y PATCH para persistir `hwRevision`

#### Seed
- Añadidas 7 recetas adicionales (Pearl Oyster, Pink Oyster, Shiitake, Lion's Mane, Reishi, Cordyceps, Turkey Tail)
- Parámetros adaptados al modelo actual

**Resultado**: Base de datos más robusta, asociaciones claras entre dispositivos y ciclos, y mejor soporte para registro/reclamación de hardware.

---

### Frontend — v1.3.0

#### Settings Panel (Arquitectura Completa)
- `Settings.jsx` convertido en layout con rutas anidadas + `SettingsNav`
- Implementadas páginas dedicadas: `DeviceSettings`, `CultivationSettings`, `SystemSettings`, `UserSettings` y `SettingsHub`
- Sistema global de tema claro/oscuro con `ThemeContext`
- Flujo completo de **2FA** en `UserSettings`
- Reorganización de secciones y limpieza visual

#### Conexión Real con Backend
- Eliminados todos los mocks en Settings
- Añadidos métodos: `getSystemMetrics()`, `updateProfile()`, `updateDevice()`, `claimDevice()`
- `StatusFooter` ahora muestra versión real del sistema
- Fix global de color de texto en inputs para tema oscuro

#### Limpieza General
- `Landing.jsx`: Eliminados elementos decorativos (partículas, micelio, parallax, stats falsos)
- `Dashboard`, `DeviceDetail`, `Cycles` y `Recipes`: Eliminados datos hardcodeados y componentes sci-fi
- `Home.jsx` reemplazado por redirección a `/dashboard`
- Terminología estandarizada (sci-fi → técnica)
- Fixes menores: key en logs, React Router v7 flags, navegación en TopBar

**Resultado**: Frontend mucho más limpio, profesional y completamente conectado al backend.

---

### Firmware (ESP32-S3) — v0.12.0

- Mejora en flujo de registro y status MQTT
  - Al recibir status se actualiza/inserta dispositivo con datos reales
  - Segunda oportunidad de registro si HTTP falla
- Variables compartidas: `sharedMac`, `sharedFwVer`, `sharedHwRev`
- `publishStatus()` ahora incluye `macAddress`, `firmwareVersion` y `hwRevision`
- `registerDevice()` envía `hwRevision`
- BLE Provisioning soporta `HW_REVISION` configurable

---

## 2026-07-08

### Frontend — v1.1.3 → Preparación React Router v7

- **Actualización**: Añadido prop `future` a `<BrowserRouter>` en `App.jsx`
- **Configuración**:
  - Activados: `v7_startTransition` y `v7_relativeSplatPath`
- **Limpieza**: Silenciados los warnings de deprecación del inspector de React Router
- Preparación anticipada para la migración a **React Router v7**

**Resultado**: Código futuro-compatible y sin warnings de deprecación.

## 2026-07-08

### Frontend — v1.1.2 → Fixes React + Gauge Consistency

- **Bug fix**: Añadido `key={i}` en el `.map()` de logs (línea 348)
  - Eliminado warning de React: *"Each child in a list should have a unique key"*
  - Build limpio (0 warnings)
- **Corrección**: Solucionada referencia a `GREEN` en la rama fallback del operador ternario (línea 68)
  - Ahora usa `GAUGE_COLORS.green` de forma consistente
  - Gradient recibe correctamente el array `[{ offset: 0, color: GAUGE_COLORS.green }, ...]`

**Resultado**: Eliminación completa de warnings en build y mayor consistencia en el manejo de colores del sistema de gauges.

## 2026-07-08

### Frontend — v1.1.1 → Mejoras CSS + Limpieza Design System

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

## 2026-07-07

### Backend — v0.9.0

- **POST /devices/register** (público): crea dispositivo sin `userId` si no existe (soporte inicial de provisioning)
- **PATCH /devices/:id** (autenticado): permite actualizar `ssrActiveLow` y asignar `userId`
- Mejorado `findOrCreate` para el flujo completo de provisioning BLE
- Devuelve `ssrActiveLow` en el endpoint de polling `GET /`
- Soporte para que el firmware sincronice la configuración de polaridad desde el backend
- Nuevo campo `ssrActiveLow`: BOOLEAN, default: `true`
- Permite configurar polaridad de los SSR (active-LOW / active-HIGH) por dispositivo

**Resultado**: Backend ahora soporta completamente el flujo de provisioning BLE + configuración dinámica de polaridad SSR por dispositivo, con endpoints más flexibles y seguros.

### Frontend — v1.1.0

- **Provisioning.jsx**: toggle de modo SSR + claim device (asignación de `userId`)
- **DeviceDetail.jsx**: nuevo panel **SSR CONFIGURATION** con toggle persistente
- Corregido control de actuadores en dispositivos nuevos (integración con `findOrCreate` del backend)
- Mejora general en UX de configuración de polaridad SSR

**Resultado**: La interfaz ahora ofrece una experiencia de provisioning y configuración de hardware (SSR) mucho más intuitiva y robusta, corrigiendo problemas en dispositivos recién registrados y asegurando un canal para añadir dispositivos.

### Firmware (ESP32-S3) — v0.11.0

- Agrega soporte completo para `SSR_ACTIVE_LOW` y constantes BLE
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

### Documentación y Gobernanza — Auditoría & Reestructuración

- **Reestructuración completa de directorios**: Implementada la nueva taxonomía definida en `ADR-015`.
- **Nuevo**: `docs/README.md` — Índice navegable maestro del proyecto para colaboradores humanos y agentes de IA.
- **Nuevo**: `design/components.md` — Catálogo completo de componentes organizados por capas.
- **Nuevo**: `design/design-tokens.md` — Sistema de tokens centralizado.
- **Nuevo**: Carpeta `docs/edd/` (Engineering Design Documents) con template y los siguientes documentos:
  - `EDD-001-sistema-control-ambiental.md` (Visión completa del sistema)
  - `EDD-002-motor-reglas-recetas.md` (Motor de reglas e histéresis)
  - `EDD-003-ota-v3-canary-deployment.md` (Estrategia de actualizaciones en 4 capas)
  - `EDD-004-estrategia-multitenant.md` (Aislamiento de datos y escalabilidad)
- **Nuevo**: Carpeta `docs/rfc/` (Request for Comments) con template y propuestas iniciales en estado DRAFT:
  - `RFC-0001-template.md` (Plantilla estándar)
  - `RFC-0002-https-tls-firmware.md` (Migración a HTTPS/TLS en firmware)
  - `RFC-0003-mqtt-v2-upgrade.md` (Broker propio + TLS + ACL)
  - `RFC-0004-multi-device-dashboard.md` (Dashboard multi-dispositivo)
  - `RFC-0005-notificaciones-push.md` (Alertas vía Telegram/Email)
- **Nuevo**: `docs/ADR/ADR-015-docs-restructure.md` — Registro formal de la decisión arquitectónica de esta reestructuración.
- **Consolidación**: Unificación de todos los roadmaps en un único archivo autoritativo `docs/roadmap/roadmap.md`. Versiones antiguas archivadas en `docs/roadmap/archive/`.
- **Limpieza y movimientos**:
  - Eliminado `docs/firmware.md` (duplicado obsoleto).
  - Reescrito completamente `docs/architecture/firmware.md` con el estado actual (ESP32-S3 + FreeRTOS + 6 tareas + HTTP Polling).
  - Movido `docs/database.md` → `docs/architecture/database.md`
  - Movido `docs/ui-standards.md` → `docs/design/ui-standards.md`
  - Movido `docs/deployment.md` → `docs/operations/deployment.md`
  - Movido `docs/operations.md` → `docs/operations/runbook.md`
  - Eliminadas carpetas obsoletas `docs/context/` y `docs/issues/`.
  - Expandido `docs/governance/decision-tree.md` con lineamientos de gobernanza, protocolos y control de fallos.
  - Creado `docs/diagrams/exports/README.md` con instrucciones de exportación de diagramas `.drawio`.

**Resultado**: La documentación técnica ahora está limpia, modular, profesional y preparada para la colaboración tanto humana como con agentes de inteligencia artificial.

## 2026-07-06

### Frontend — v1.0.3

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
  - **Botones de rango de tiempo** en sidebar: texto de `7px` → `10px`, padding mejorado
  - **Ancho de columna** del sidebar: `36px` → `48px` (evita recorte de texto)
  - **Leyenda**: puntos de `6px × 6px` → `10px × 10px`, texto de `7px` → `10px`
  - **Leyenda en footer**: texto de `7px` → `10px`, líneas de `10px × 2px` → `14px × 4px`
  - **Bandas de referencia**: aumentada opacidad de fondo de las bandas de Temperatura y Humedad (`0.15` fill, `0.4` stroke) para mayor visibilidad
  - **Nueva funcionalidad**: Toggle de visibilidad de líneas
    - Estado `visibleLines` en React para controlar líneas activas
    - Click en badges de la leyenda para activar/desactivar líneas
    - Badges atenuados (`opacity: 0.35`) cuando están inactivos
    - `computeRanges` actualizado para ignorar líneas ocultas y reajustar automáticamente el eje Y
    - Plugin de bandas de referencia ahora solo dibuja las bandas de las líneas activas

**Verificación**:
- Compilación de producción exitosa (`pnpm build`) sin errores ni warnings.

**Resultado**: Dashboard significativamente más legible, con mejor jerarquía visual, controles más grandes y funcionales, y gráficos más claros e interactivos.

## 2026-07-06

### Frontend — v1.0.2

- **Nuevo**: Botón **ADD DEVICE** en el header del Dashboard
- **Mejora**: `DevicesEmptyState` ahora redirige al flujo de provisioning con botón principal destacado
- **Limpieza**: Eliminado enlace directo a provisioning del Sidebar (mejor UX centralizada)
- **Nuevo**: Ruta `/provisioning` agregada al `BrowserRouter`
- **Nuevo**: Wizard completo de aprovisionamiento BLE (4 pasos):
  - Escanear dispositivos
  - Configurar credenciales WiFi
  - Enviar datos vía Web Bluetooth
  - Estado final (Listo / Error)
- Manejo completo de estados, conexión BLE, envío de credenciales y feedback visual en tiempo real
- Integración fluida con el flujo de provisioning del firmware

**Resultado**: Flujo de onboarding de nuevos dispositivos mucho más intuitivo y centrado en el usuario.

## 2026-07-06

### Backend — v0.8.1

- **Nuevo endpoint**: `POST /api/v1/devices/register`
- Endpoint **público** (sin autenticación JWT) diseñado para que el firmware se autoregistre automáticamente tras completar el provisioning BLE.
- Permite el registro del dispositivo con:
  - MAC Address
  - `deviceId`
  - Información de hardware (modelo, versión de firmware, etc.)
  - Datos adicionales de aprovisionamiento

**Propósito**: Soporte completo al flujo de aprovisionamiento BLE → registro automático en backend sin intervención manual.

## 2026-07-06

### Firmware (ESP32-S3) — v0.10.0

- **Nuevo**: `BLEProvisioning` — Servidor GATT completo con 5 characteristics (`device_info`, `wifi_ssid`, `wifi_pass`, `prov_cmd`, `prov_status`)
- **Nuevo**: Persistencia en NVS (`namespace: mush2_prov`)
- **Nuevo**: Callbacks para `provision`, `reset` y `factory_reset`
- **Configuración**:
  - Agregados flags: `CONFIG_BT_ENABLED=1`, `CONFIG_BT_BLE_ENABLED=1`, `CONFIG_BT_NIMBLE_ENABLED=1`
  - Soporte BLE habilitado en ambos entornos (dev + producción)
- **State Machine**:
  - Nuevo estado `ST_PROVISIONING` (índice 9)
  - Matriz de transiciones expandida a 10×10
  - Soporte completo para modo provisioning
- **Configuración**:
  - Nuevos defines: `BLE_PROV_TIMEOUT_MS` y `BLE_DEVICE_NAME_PREFIX` con valores por defecto
- **Mejoras**:
  - `setProvisionedCredentials()` para cargar credenciales desde NVS
  - Soporte mejorado para `String` en lugar de `const char*`
  - Integración fluida con el flujo completo de BLE provisioning
- **Lógica de Arranque**:
  - En `setup()`: Si no hay credenciales → entra en **modo provisioning** (BLE + tarea idle)
  - Si hay credenciales → modo normal (WiFi + MQTT + sensores)
  - Integración completa del flujo BLE

**Resultado**: El dispositivo ahora puede ser aprovisionado de forma inalámbrica vía BLE sin necesidad de cables ni configuración previa por USB/Serial.

## 2026-07-05

### Documentación y Gobernanza — Audit & Restructure

- **Reestructuración de Directorios**: Se implementó la taxonomía definida en `ADR-015`.
- **Nuevo**: `docs/README.md` — Índice navegable maestro del proyecto para colaboradores y agentes de IA.
- **Nuevo**: Carpeta `docs/edd/` (Engineering Design Documents) con template y diseño de:
  - `EDD-001-sistema-control-ambiental.md` (Sistema completo)
  - `EDD-002-motor-reglas-recetas.md` (Motor de reglas)
  - `EDD-003-ota-v3-canary-deployment.md` (OTA v3 4-capas)
  - `EDD-004-estrategia-multitenant.md` (Aislamiento de datos y escalabilidad)
- **Nuevo**: Carpeta `docs/rfc/` (Request for Comments) con template y propuestas iniciales en DRAFT:
  - `RFC-template.md` (Plantilla de propuesta)
  - `RFC-0001-https-tls-firmware.md` (Migración HTTPS/TLS en firmware)
  - `RFC-0002-mqtt-v2-upgrade.md` (Broker propio + TLS + autenticación ACL)
  - `RFC-0003-multi-device-dashboard.md` (Dashboard multi-dispositivo simultáneo)
  - `RFC-0004-notificaciones-push.md` (Alertas Telegram/Email)
- **Nuevo**: `docs/ADR/ADR-015-docs-restructure.md` — Registro de decisión arquitectónica de esta reestructuración.
- **Consolidación**: Unificación de roadmaps (`roadmap.md`, `roadmap-frontend.md`, `roadmap-consolidacion.md`, `roadmap-ota.md`) en un único `docs/roadmap/roadmap.md` autoritativo. Archivos antiguos movidos a `docs/roadmap/archive/`.
- **Mantenimiento**:
  - Eliminado `docs/firmware.md` (duplicado obsoleto).
  - Actualizado `docs/architecture/firmware.md` para reflejar el estado actual del firmware (ESP32-S3 + FreeRTOS + HTTP Polling).
  - Movido `docs/database.md` → `docs/architecture/database.md`.
  - Movido `docs/ui-standards.md` → `docs/design/ui-standards.md`.
  - Movido `docs/deployment.md` → `docs/operations/deployment.md`.
  - Movido `docs/operations.md` → `docs/operations/runbook.md`.
  - Eliminada carpeta obsoleta `docs/context/` y `docs/issues/` (luego de migración visual y de OTA).
  - Expandido `docs/governance/decision-tree.md` con lineamientos de gobernanza, protocolo y control.
  - Creado `docs/diagrams/exports/README.md` con instrucciones de exportación de archivos `.drawio`.

## 2026-07-04

### Frontend — v1.0.2

## Frontend - Migración a CSS Puro + Design System

- **Refactorización completa**: Se migró a un sistema de diseño basado en **CSS Variables** + utilidades propias, desarrollando un estilo bioluminiscente del prototipo.
- **Nuevo**: Sistema de Design Tokens en `:root` (`--spore-green`, `--teal`, `--surface-container`, `--on-surface`, etc.).
- **Nuevo**: Componentes de layout: `AppShell`, `Sidebar`, `TopBar`, `StatusFooter` y `BottomNav` (responsive).
- **Nuevo**: Componentes UI: `DomeGauge`, `ChartPanel`, `MetricCard`, `StatusBadge`, `TerminalLog`, `ToggleSwitch`, `EmptyState`, `ErrorState`, `OfflineBanner`, `LoadingState`.
- **Nuevo**: `AuthModal` y `Landing` page con parallax, breathing nodes, red de micelio SVG y partículas animadas.
- **Nuevo**: `DeviceDetail` completamente rediseñado con gauges tipo domo, gráficos de historial, System Log en vivo y Actuator Matrix.
- **Mejora**: Unificación de botones (`.btn-primary`, `.btn-danger`, `.btn-ghost`, etc.) y formularios.
- **Mejora**: Animaciones y efectos (pulse-glow, breathe, slideUp, glassmorphism) consistentes con el prototipo.
- **Limpieza**: Eliminación de clases Tailwind inexistentes, estilos inline redundantes y configuración de Tailwind.
- **Optimización**: Mejor balance de altura entre secciones (gauges vs System Log) y responsividad móvil.

**Resultado**: Frontend ahora es más ligero, mantenible y fiel al diseño original del prototipo sin dependencias innecesarias.

### Firmware (ESP32-S3) — v0.9.3

- test of operativity - Sucessfull

## 2026-07-04

### Firmware (ESP32-S3) — v0.9.2

- Update stable actuator version

## [0.9.1] — 2026-06-29 — OTA v3 + HTTP Poller fixes

### ADRs

- `ADR-014-OTA-v3.md`: Estado **Propuesto → Implementado**. Sección de implementación agregada con archivos creados, flujo completo, MQTT integrado, fixes aplicados y comprobación en hardware.

### Firmware (ESP32-S3) — OTA v3

- **Nuevo**: `ota_nvs.{h,cpp}` — Inicialización NVS con esquema v1, key `fw_version`
- **Nuevo**: `ota_decisor.{h,cpp}` — `OTASelector` con validación URL, SemVer, RSSI
- **Nuevo**: `ota_shutdown.{h,cpp}` — `OTAShutdown` para apagado seguro SSR/sensores/comms
- **Nuevo**: `ota_executor.{h,cpp}` — `OTAExecutor` con descarga HTTPS vía `Update.write()`
- **Nuevo**: `ota_postboot.{h,cpp}` — `OTAConfirmation` con self-test + confirmación MQTT
- **Nuevo**: `mqtt_client.{h,cpp}` — Cliente MQTT PubSubClient, tarea FreeRTOS dedicada
- **Nuevo**: `partitions.csv` — OTA dual 8MB (app0/app1, spiffs 1.5MB, coredump)
- **Nuevo**: `state_machine.{h,cpp}` — Matriz 9×9 con `fsmTransition()`
- **Integración MQTT**: Subscribe a `mush2/{deviceId}/ota/command`, publica `ota/rejected` y `ota/status` con retain
- **Limpieza**: Eliminados `startArduinoOTA()`, `startHTTPUpdate()`, `isUpdating()` de `ota_handler`
- `getVersion()` ahora lee de NVS con fallback a `FIRMWARE_VERSION="0.9.0"`
- `nvsSetFwVer(cand.version)` post-ejecución exitosa

### Firmware (ESP32-S3) — HTTP Poller fixes

- **Bug fix**: Stack overflow silencioso mataba el poller HTTP → `STACK_POLLER 4096→8192`
- **Bug fix**: `client.connect()` sin timeout bloqueaba hasta ~20s → `client.connect(host,port,5000)`
- **Bug fix**: `client.printf()` sin flush no enviaba datos al wire → `client.flush()` post-printf
- **Bug fix**: `Transfer-Encoding: chunked` no manejado → de-chunking en `runParse()`
- **Bug fix**: `continue` en `taskOTA()` saltaba `vTaskDelayUntil` → reemplazado por `goto ota_skip`
- **Mejora**: `DELAY_POLLER 100→500ms`, `DELAY_MQTT 50→500ms` para reducir CPU waste
- **Mejora**: `vTaskDelay(50)` tras connect para estabilizar TCP
- `BACKEND_PORT` corregido de 3000→3797 para coincidir con backend Express

### Documentación

- `README.md`: Referencia a ADR-014 agregada
- `docs/ADR/ADR-014-OTA-v3.md`: Implementación completa documentada (archivos, flujo, fixes, comprobación)
- `docs/issues/ota-v3/`: Estados de fases actualizados a completado
- `CHANGELOG.md`: Esta entrada

## [0.9.0] — 2026-06-28 — Arquitectura FreeRTOS + Estrategia de Seguridad

### ADRs

- `ADR-012-FreeRTOS.md`: Arquitectura formal de tareas FreeRTOS, sincronización con colas (cmdQueue, sensorDataQueue), sistema de watchdog jerárquico unificado (TWDT + SWDT + Health Check) y roadmap de refactorización en 4 fases.
- `ADR-013-Seguridad-Estrategia.md`: Estrategia de seguridad por capas con 8 dominios (secretos, transporte, autenticación de dispositivos, hardening firmware, backend, frontend, auditoría, supply chain). Roadmap en 5 fases.

### Firmware (ESP32-S3)

- v0.9.0 consolidada (ya actualizada en commits anteriores)
- 6 tareas FreeRTOS documentadas formalmente con prioridades, stacks y delays
- Watchdog documentado como sistema de 3 niveles

### Backend

- Version bump: 0.8.0 → 0.9.0

### Frontend

- Version bump: 0.8.0 → 0.9.0

### Documentación (docs/)

- **README.md**: Actualizado a v0.9.0 con referencias a ADR-012, ADR-013, stack FreeRTOS, arquitectura de seguridad
- **docs/architecture/architecture.md**: Diagrama actualizado con FreeRTOS, SSR 4 canales, watchdog jerárquico; sección de seguridad actualizada por ADR-013
- **docs/architecture/backend.md**: Versión 0.9.0, servicios actualizados (mqttBridge, webSocketServer), modelo ApiKey
- **docs/architecture/firmware.md**: Reescrito completo: 6 tareas FreeRTOS, pinout real de config.h, watchdog jerárquico, sincronización con colas, ciclo principal FreeRTOS
- **docs/architecture/frontend.md**: Version bump, flujo auth con httpOnly cookie (ADR-013)
- **docs/roadmap.md**: Fase 0 actualizada con ADR-001 a ADR-013; fase 14 actualizada; v0.9.0 como versión actual
- **docs/roadmap/milestone.md**: Referencias a ADRs actualizadas, v0.9.0
- **docs/roadmap/otras-consideraciones.md**: Items vinculados a fases correctas del roadmap
- **docs/requirements.md**: Requisitos actualizados con FreeRTOS, watchdog jerárquico, NVS, Secure Boot
- **docs/database.md**: Modelo ApiKey integrado en relaciones, PostgreSQL 16
- **docs/deployment.md**: Notas de seguridad (NVS, generate_config.py), HTTPS
- **docs/operations.md**: Version bump, security maintenance actualizado
- **docs/scalability.md**: Version bump
- **docs/firmware.md**: Actualizado con FreeRTOS, tareas, watchdog jerárquico, pinout correcto

---

## [0.8.1] — 2026-06-27 — Fix Stack Overflow + LAN Connectivity

### Firmware (ESP32-S3)

- **Bug fix crítico**: Stack canary overflow (`Guru Meditation: Stack canary watchpoint triggered`)
  causado por `WiFiClientSecure` (mbedTLS) al intentar TLS. El TLS handshake
  requería ~80 KB de stack; la tarea HTTP tenía insuficientes 48 KB (12288 words).
- `config.h`: `STACK_HTTP` aumentado de 12288 → 20480 words (~80 KB) como medida defensiva.
- `config.h`: Nuevo flag `HTTP_DISABLE_TLS` para compilación sin TLS (LAN local).
- `config.h`: Backend apuntado a IP LAN del PC (`192.168.1.6:3797`).
- `http_handler.h`: Cliente HTTP polling con compilación condicional para TLS.
- `http_handler.cpp`: Eliminado reintento automático PLAIN→TLS que causaba el reboot loop.
  La lógica de fallback ahora rota solo entre endpoints.
  `BACKOFF_MAX` reducido de 180s → 60s (LAN no necesita backoff largo).
- `http_handler.cpp`: Pre-resolución DNS inteligente: si `API_HOST` es una IP literal,
  no llama a resolución DNS (ahorra ~12s de bloqueo por boot).

### Infraestructura

- Eliminada dependencia de Mosquitto/HiveMQ; la comunicación ahora es HTTP directo al backend.

### Backend

- `.env`: `API_HOST` configurado como `localhost`.
- `.env`: `DEVICE_ID` configurado como `mush2_A0F262E55CBC` (MAC del ESP32-S3).

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
