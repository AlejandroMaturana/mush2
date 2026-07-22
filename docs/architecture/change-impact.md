# Change Impact — Mush2

> Mapa de dependencias entre componentes. Si modificas X, afecta Y.

---

## Cómo usar este documento

1. Identifica qué archivo vas a modificar
2. Busca ese archivo en las tablas de abajo
3. Revisa la columna "Afecta" para saber qué otros archivos/componentes se impactan
4. Revisa la columna "Contrato" si aplica

---

## Backend — Archivos Críticos

### `backend/src/middlewares/auth.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las rutas que usan `authenticate` | Backend routes | 🔴 |
| `client.js` (interceptors JWT) | Frontend | 🔴 |
| Firmware HTTP polling (si usa API key) | Firmware | 🟡 |

**Contrato**: `docs/contracts/api-contract.md` (sección Auth)

---

### `backend/src/middlewares/rbac.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las rutas con `requireMinRole` | Backend routes | 🔴 |
| `admin.js` routes | Backend | 🔴 |
| Seed de usuarios (`seed.js`) | Backend | 🟡 |

---

### `backend/src/middlewares/tenant.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las rutas con `tenantScope` | Backend routes (devices, recipes, cycles, alarms, analytics, species) | 🔴 |
| Cada modelo con `userId`/`createdBy` | Models | 🔴 |

---

### `backend/src/models/index.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las queries con associations | Todas las routes + services | 🔴 |
| `db:sync` y migraciones | DB | 🔴 |
| Seed data | `seed.js` | 🔴 |

---

### `backend/src/services/controlEngine.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Evaluación de ciclos de cultivo | Recipes/Cycles | 🔴 |
| Control de actuadores | Firmware (recibe comandos) | 🔴 |
| SSE events `control_eval` | Frontend (Dashboard, Cycles) | 🟡 |
| Overheat protection | Firmware (seguridad) | 🔴 |

**Contrato**: `docs/contracts/mqtt-contract.md` (topics de comandos)

---

### `backend/src/services/mqttBridge.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Recepción de telemetría | Telemetry models, API | 🔴 |
| Envío de comandos | Firmware (recibe) | 🔴 |
| DeviceHealth/DeviceMaintenance | Models | 🟡 |
| MQTT topics | Firmware pub/sub | 🔴 |

**Contrato**: `docs/contracts/mqtt-contract.md` (completo)

---

### `backend/src/routes/api.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Telemetría HTTP | Firmware HTTPPoller | 🔴 |
| Polling de comandos | Firmware HTTPPoller | 🔴 |
| `api-contract.md` | Docs | 🔴 |

**Contrato**: `docs/contracts/api-contract.md` (endpoints `/devices`, `/telemetry`, `/poll`)

---

### `backend/src/services/eventBus.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Todos los servicios que emiten/consumen eventos | Backend (controlEngine, mqttBridge, webSocketServer, telegramService) | 🔴 |
| SSE → Frontend | Frontend | 🟡 |

---

### `backend/src/services/webSocketServer.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Frontend real-time updates | Frontend | 🟡 |
| Alarm notifications | Frontend AlarmContext | 🟢 |

---

### `backend/src/app.js`

| Afecta | Componente | Severidad |
|---|---|---|
| CORS, Helmet, rate limiting | Todo el sistema | 🔴 |
| Static file serving | Frontend (producción) | 🟡 |
| Mount de rutas | Todos los endpoints | 🔴 |

---

### `backend/src/server.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Startup de todos los servicios | Todo el backend | 🔴 |
| HTTP server, WebSocket, MQTT, Control Engine, Telegram, ThingSpeak | Servicios | 🔴 |

---

## Frontend — Archivos Críticos

### `frontend/src/api/client.js`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las páginas que importan funciones API | 15+ páginas | 🔴 |
| Auth interceptor (token refresh) | Login, sesiones | 🔴 |
| Base URL (`/api/v1`) | Todos los endpoints | 🔴 |

---

### `frontend/src/api/AuthContext.jsx`

| Afecta | Componente | Severidad |
|---|---|---|
| `App.jsx` (rutas protegidas) | Toda la app | 🔴 |
| `client.js` (token management) | API calls | 🔴 |
| `Login.jsx`, `Landing.jsx` | Auth flow | 🟡 |

---

### `frontend/src/api/useSSE.js`

| Afecta | Componente | Severidad |
|---|---|---|
| `AlarmContext.jsx` | Alarmas globales | 🟡 |
| `Dashboard.jsx` | Telemetría real-time | 🟡 |
| `DeviceDetail.jsx` | Estado de dispositivos | 🟡 |

---

### `frontend/src/App.jsx`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las rutas | Navegación completa | 🔴 |
| `AlarmProvider` wrapper | Alarmas globales | 🟡 |
| `AppShell` wrapper | Layout | 🟢 |

---

### `frontend/src/components/layout/AppShell.jsx`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las páginas autenticadas | Layout completo | 🟡 |
| `Sidebar`, `TopBar`, `BottomNav` | Navegación | 🟢 |

---

## Firmware — Archivos Críticos

### `firmware/src/state_machine.cpp`

| Afecta | Componente | Severidad |
|---|---|---|
| Transiciones de estado | Todo el firmware | 🔴 |
| Watchdog resets | Health monitor | 🔴 |
| MQTT status reporting | Backend (DeviceHealth) | 🟡 |
| Button handler (acciones por estado) | Button subsystem | 🟡 |

---

### `firmware/src/tasks.cpp`

| Afecta | Componente | Severidad |
|---|---|---|
| Todas las FreeRTOS tasks | Todo el firmware | 🔴 |
| Prioridades y stack sizes | Estabilidad del sistema | 🔴 |
| Loop principal de cada subsistema | Sensores, actuadores, red, OTA | 🔴 |

---

### `firmware/src/hysteresis_controller.cpp`

| Afecta | Componente | Severidad |
|---|---|---|
| Control de actuadores (vent, heat, humid, light) | Hardware directo | 🔴 |
| Overheat protection | Seguridad del equipo | 🔴 |
| Setpoints (vienen de backend via HTTP/MQTT) | Recetas, control engine | 🔴 |

---

### `firmware/src/ssr_controller.cpp`

| Afecta | Componente | Severidad |
|---|---|---|
| Hardware de SSR (GPIO 11-14) | Actuadores físicos | 🔴 |
| Active-low/high mode | Configuración de hardware | 🟡 |
| NVS persistence | Estado post-reboot | 🟡 |

---

### `firmware/src/mqtt_client.cpp`

| Afecta | Componente | Severidad |
|---|---|---|
| Publicación de telemetría | Backend mqttBridge | 🔴 |
| Recepción de comandos | Backend control engine | 🔴 |
| Topics MQTT | Contrato MQTT completo | 🔴 |

**Contrato**: `docs/contracts/mqtt-contract.md`

---

### `firmware/src/http_poller.cpp`

| Afecta | Componente | Severidad |
|---|---|---|
| Polling de comandos | Backend `api.js` routes | 🔴 |
| Aplicación de actuadores | SSR Controller | 🔴 |
| Backoff y reconexión | Estabilidad de conexión | 🟡 |

**Contrato**: `docs/contracts/api-contract.md` (endpoints `/devices/:id/poll`)

---

### `firmware/src/main.ino`

| Afecta | Componente | Severidad |
|---|---|---|
| Setup de todos los módulos | Todo el firmware | 🔴 |
| Inclusión de headers | Build | 🔴 |
| Orden de inicialización | Boot sequence | 🔴 |

---

### `firmware/src/config.h`

| Afecta | Componente | Severidad |
|---|---|---|
| Todos los módulos que usan defines | Todo el firmware | 🔴 |
| WiFi, MQTT, ThingSpeak, GPIO pins | Configuración completa | 🔴 |

**Nota**: Este archivo se genera desde `.env` via `generate_config.py`. No editarlo directamente.

---

## Cross-Component — Contratos

### `docs/contracts/api-contract.md`

| Componente afectado | Dirección |
|---|---|
| Backend routes | Implementa los endpoints |
| Firmware HTTPPoller | Consume los endpoints |
| Frontend client.js | Consume los endpoints |

### `docs/contracts/mqtt-contract.md`

| Componente afectado | Dirección |
|---|---|
| Firmware MQTTClient | Publica telemetry, recibe comandos |
| Backend mqttBridge | Recibe telemetry, publica comandos |
| Backend controlEngine | Genera comandos |

### `docs/contracts/ble-contract.md`

| Componente afectado | Dirección |
|---|---|
| Firmware BLEProvisioning | Implementa el servidor BLE |
| App móvil (futuro) | Cliente BLE |

---

## Cadena de Impacto — Ejemplo

Si modificas `backend/src/services/controlEngine.js`:

```
controlEngine.js
  ├── Afecta: Recipe model (lee setpoints)
  ├── Afecta: CultivationCycle model (evalúa estado)
  ├── Afecta: Actuator model (controla canales)
  ├── Afecta: mqttBridge.js (publica comandos MQTT)
  │     └── Afecta: firmware/mqtt_client.cpp (recibe comandos)
  │           └── Afecta: firmware/ssr_controller.cpp (aplica a hardware)
  ├── Afecta: eventBus.js (emite control_eval)
  │     └── Afecta: webSocketServer.js → frontend SSE
  ├── Afecta: phaseEvaluator.js (evalúa transiciones)
  │     └── Afecta: PhaseTransition model
  └── Afecta: docs/contracts/mqtt-contract.md (si cambian topics)
```
