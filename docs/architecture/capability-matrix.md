# Capability Matrix — Mush2

> Mapa técnico de capacidades × archivos. Para cada capacidad del sistema, qué archivos la implementan, qué tan frágil es, y qué se rompe si la modificas.

---

## Leyenda

| Campo | Significado |
|-------|-------------|
| **Riesgo** | 🔴 Alto (rompe sistema) / 🟡 Medio (rompe flujo) / 🟢 Bajo (aislado) |
| **Tests** | ✅ Tiene / ⚠️ Parcial / ❌ Ninguno |
| **Toque** | 🟢 Seguro / 🟡 Con cuidado / 🔴 Solo con aprobación |

---

## 1. Autenticación & Autorización

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| JWT Login/Refresh | `backend/src/routes/auth.js` | 🔴 | ⚠️ | 🔴 |
| JWT Middleware | `backend/src/middlewares/auth.js` | 🔴 | ⚠️ | 🔴 |
| RBAC Roles | `backend/src/middlewares/rbac.js` | 🔴 | ✅ | 🔴 |
| API Keys | `backend/src/routes/apiKeys.js` | 🟡 | ❌ | 🟡 |
| API Key Model | `backend/src/models/ApiKey.js` | 🟡 | ❌ | 🟡 |
| Tenant Scope | `backend/src/middlewares/tenant.js` | 🔴 | ❌ | 🔴 |
| Rate Limiting | `backend/src/middlewares/subscriptionRateLimit.js` | 🟡 | ❌ | 🟡 |
| User Model | `backend/src/models/User.js` | 🔴 | ❌ | 🔴 |
| Subscriptions | `backend/src/models/Subscription.js` | 🟡 | ❌ | 🟡 |

**Contrato afectado**: `docs/contracts/api-contract.md` (endpoints de auth)

---

## 2. Telemetría & Sensores

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| Sensor AHT21 | `firmware/src/aht_sensor.cpp` | 🟡 | ❌ | 🟡 |
| Sensor ENS160 | `firmware/src/ens160_sensor.cpp` | 🟡 | ❌ | 🟡 |
| Driver AHT21 | `firmware/src/drivers/aht21/aht21_driver.cpp` | 🟡 | ❌ | 🟡 |
| Driver ENS160 | `firmware/src/drivers/ens160/ens160_driver.cpp` | 🟡 | ❌ | 🟡 |
| Sensor Registry | `firmware/src/sensor_registry.cpp` | 🟢 | ❌ | 🟢 |
| Telemetry Buffer | `firmware/src/telemetry_buffer.cpp` | 🟢 | ❌ | 🟢 |
| Telemetry Model | `backend/src/models/Telemetry.js` | 🟢 | ❌ | 🟢 |
| HTTP Telemetry | `backend/src/routes/api.js` | 🟡 | ⚠️ | 🟡 |
| MQTT Bridge | `backend/src/services/mqttBridge.js` | 🔴 | ❌ | 🔴 |
| ThingSpeak Sync | `backend/src/services/thingSpeakSync.js` | 🟢 | ❌ | 🟢 |
| ThingSpeak Client | `firmware/src/thingspeak_client.cpp` | 🟢 | ❌ | 🟢 |

**Contrato afectado**: `docs/contracts/api-contract.md` (telemetry endpoints), `docs/contracts/mqtt-contract.md` (topics de telemetría)

---

## 3. Control de Actuadores

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| SSR Controller | `firmware/src/ssr_controller.cpp` | 🔴 | ❌ | 🔴 |
| Hysteresis Ctrl | `firmware/src/hysteresis_controller.cpp` | 🔴 | ❌ | 🔴 |
| Actuator NVS | `firmware/src/actuator_nvs.cpp` | 🟡 | ❌ | 🟡 |
| Actuator Model | `backend/src/models/Actuator.js` | 🟡 | ❌ | 🟡 |
| Actuator Routes | `backend/src/routes/actuators.js` | 🟡 | ❌ | 🟡 |
| Control Engine | `backend/src/services/controlEngine.js` | 🔴 | ❌ | 🔴 |
| Phase Evaluator | `backend/src/services/phaseEvaluator.js` | 🔴 | ❌ | 🔴 |
| ActuatorControl (FE) | `frontend/src/components/device/ActuatorControl.jsx` | 🟢 | ❌ | 🟢 |

**Contrato afectado**: `docs/contracts/mqtt-contract.md` (topics de comandos SSR)

---

## 4. Recetas & Ciclos de Cultivo

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| Recipe Model | `backend/src/models/Recipe.js` | 🟡 | ❌ | 🟡 |
| CultivationCycle | `backend/src/models/CultivationCycle.js` | 🟡 | ❌ | 🟡 |
| CycleState | `backend/src/models/CycleState.js` | 🟢 | ❌ | 🟢 |
| PhaseTransition | `backend/src/models/PhaseTransition.js` | 🟢 | ❌ | 🟢 |
| SpeciesProfile | `backend/src/models/SpeciesProfile.js` | 🟢 | ❌ | 🟢 |
| BioactiveProfile | `backend/src/models/BioactiveProfile.js` | 🟢 | ❌ | 🟢 |
| Recipe Routes | `backend/src/routes/recipes.js` | 🟡 | ❌ | 🟡 |
| Cycle Routes | `backend/src/routes/cycles.js` | 🟡 | ❌ | 🟡 |
| Species Routes | `backend/src/routes/species.js` | 🟢 | ❌ | 🟢 |
| Recipes Page (FE) | `frontend/src/pages/Recipes.jsx` | 🟢 | ❌ | 🟢 |
| Cycles Page (FE) | `frontend/src/pages/Cycles.jsx` | 🟢 | ❌ | 🟢 |

---

## 5. Dispositivos & Provisioning

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| Device Model | `backend/src/models/Device.js` | 🟡 | ❌ | 🟡 |
| Chamber Model | `backend/src/models/Chamber.js` | 🟢 | ❌ | 🟢 |
| DeviceManager (FW) | `firmware/src/device_manager.h/cpp` | 🟡 | ❌ | 🟡 |
| State Machine (FW) | `firmware/src/state_machine.cpp` | 🔴 | ❌ | 🔴 |
| BLE Provisioning | `firmware/src/ble_provisioning.cpp` | 🟡 | ❌ | 🟡 |
| HTTP Poller (FW) | `firmware/src/http_poller.cpp` | 🔴 | ❌ | 🔴 |
| MQTT Client (FW) | `firmware/src/mqtt_client.cpp` | 🔴 | ❌ | 🔴 |
| Provisioning (FE) | `frontend/src/pages/Provisioning.jsx` | 🟢 | ❌ | 🟢 |
| DeviceDetail (FE) | `frontend/src/pages/DeviceDetail.jsx` | 🟢 | ❌ | 🟢 |

---

## 6. Seguridad & Monitoreo

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| Encryption | `backend/src/services/encryption.js` | 🔴 | ❌ | 🔴 |
| Audit Service | `backend/src/services/auditService.js` | 🟢 | ❌ | 🟢 |
| Alarm Model | `backend/src/models/Alarm.js` | 🟡 | ❌ | 🟡 |
| Alarm Routes | `backend/src/routes/alarms.js` | 🟡 | ❌ | 🟡 |
| Telegram Service | `backend/src/services/telegramService.js` | 🟢 | ❌ | 🟢 |
| Health Monitor (FW) | `firmware/src/health_monitor.cpp` | 🟡 | ❌ | 🟡 |
| Predictive Maint (FW) | `firmware/src/predictive_maintenance.cpp` | 🟢 | ❌ | 🟢 |
| Boot Test (FW) | `firmware/src/boot_test.cpp` | 🟢 | ❌ | 🟢 |
| Logger (FW) | `firmware/src/logger.cpp` | 🟢 | ❌ | 🟢 |
| Logger (BE) | `backend/src/services/logger.js` | 🟢 | ✅ | 🟢 |

---

## 7. OTA Updates

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| OTA Handler | `firmware/src/ota_handler.cpp` | 🟡 | ❌ | 🟡 |
| OTA Decisor | `firmware/src/ota_decisor.cpp` | 🟡 | ❌ | 🟡 |
| OTA Executor | `firmware/src/ota_executor.cpp` | 🔴 | ❌ | 🔴 |
| OTA Post-boot | `firmware/src/ota_postboot.cpp` | 🔴 | ❌ | 🔴 |
| OTA NVS | `firmware/src/ota_nvs.cpp` | 🟡 | ❌ | 🟡 |
| OTA Shutdown | `firmware/src/ota_shutdown.cpp` | 🟢 | ❌ | 🟢 |

**Contrato afectado**: `docs/RFC/RFC-0001-https-tls-firmware.md`, `docs/EDD/EDD-003-ota-v3-canary-deployment.md`

---

## 8. Frontend — Dashboard & UI

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| Dashboard | `frontend/src/pages/Dashboard.jsx` | 🟢 | ❌ | 🟢 |
| AppShell/Layout | `frontend/src/components/layout/AppShell.jsx` | 🟡 | ❌ | 🟡 |
| Auth Context | `frontend/src/api/AuthContext.jsx` | 🟡 | ❌ | 🟡 |
| SSE Hook | `frontend/src/api/useSSE.js` | 🟡 | ❌ | 🟡 |
| API Client | `frontend/src/api/client.js` | 🟡 | ❌ | 🟡 |
| Theme Context | `frontend/src/contexts/ThemeContext.jsx` | 🟢 | ❌ | 🟢 |
| Alarm Context | `frontend/src/contexts/AlarmContext.jsx` | 🟢 | ❌ | 🟢 |
| TemporalEngine | `frontend/src/services/TemporalEngine.js` | 🟢 | ❌ | 🟢 |
| Gauges (Arc/Dome) | `frontend/src/components/ui/ArcGauge.jsx`, `DomeGauge.jsx` | 🟢 | ❌ | 🟢 |
| Charts | `frontend/src/components/ui/ChartPanel.jsx`, `DeviceHistoryChart.jsx` | 🟢 | ❌ | 🟢 |

---

## 9. Infraestructura & Config

| Capacidad | Archivos | Riesgo | Tests | Toque |
|---|---|---|---|---|
| DB Config | `backend/src/config/database.js` | 🔴 | ❌ | 🔴 |
| Env Config | `backend/src/config/env.js` | 🟡 | ❌ | 🟡 |
| System Settings | `backend/src/config/systemSettingsDefaults.js` | 🟡 | ❌ | 🟡 |
| Event Bus | `backend/src/services/eventBus.js` | 🟡 | ❌ | 🟡 |
| WebSocket Server | `backend/src/services/webSocketServer.js` | 🟡 | ❌ | 🟡 |
| Sync DB | `backend/src/sync-db.js` | 🟡 | ❌ | 🟡 |
| Seed | `backend/src/seed.js` | 🟢 | ❌ | 🟢 |
| Data Retention | `backend/src/jobs/dataRetentionJob.js` | 🟡 | ❌ | 🟡 |
| Firmware Config | `firmware/src/config.h` (generado) | 🔴 | ❌ | 🔴 |
| Config Generator | `firmware/generate_config.py` | 🟡 | ❌ | 🟡 |
| PlatformIO | `firmware/platformio.ini` | 🟡 | ❌ | 🟡 |
| CI/CD | `.github/workflows/ci.yml` | 🟡 | ❌ | 🟡 |

---

## Resumen de Cobertura de Tests

| Componente | Archivos fuente | Con tests | Cobertura |
|---|---|---|---|
| Backend | 72 | 4 | ~6% |
| Frontend | 63 | 0 | 0% |
| Firmware | 68 | 9 (hardware) | Solo integración física |
| **Total** | **203** | **13** | **~6%** |

**Prioridad de testing**: Los archivos marcados con 🔴 y ❌ en tests son los más urgentes de cubrir.
