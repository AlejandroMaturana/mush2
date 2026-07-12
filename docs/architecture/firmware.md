# Arquitectura del Firmware — Mush2

> **Plataforma**: ESP32-S3 (ESP32-S3-DevKitC-1)
> **RTOS**: FreeRTOS (7 tareas en 2 núcleos)
> **Framework**: Arduino Core for ESP32
> **Board PlatformIO**: `esp32-s3-devkitc-1`
> **Comunicación con backend**: HTTP Polling (REST API) — no MQTT directo

---

## Hardware Objetivo

| Componente | Modelo | Interfaz |
|---|---|---|
| MCU | ESP32-S3 (ESP32-S3-DevKitC-1) | — |
| Temp/Humedad | AHT21 | I2C (0x38) |
| CO₂/VOC/AQI | ENS160 | I2C (0x53) |
| Relés SSR | SSR 4 canales (active-LOW configurable) | GPIO 11–14 |
| LED RGB | NeoPixel (1 px) | GPIO 48 |

---

## Stack

| Capa | Herramienta |
|---|---|
| Framework | Arduino Core for ESP32 |
| Build System | PlatformIO |
| Lenguaje | C++17 |
| RTOS | FreeRTOS (integrado en ESP-IDF) |
| HTTP | HTTPClient (Arduino) |
| Watchdog | TWDT (IDF) + SWDT software + Health Check |
| Configuración | `config.h` generado desde `.env` vía `generate_config.py` |
| OTA | ArduinoOTA (WiFi) + ESP32HTTPUpdate (HTTP) |
| Almacenamiento | NVS (Non-Volatile Storage) para contador de reboots |
| Serial | 115200 baud (logs de diagnóstico) |

---

## Estructura de Directorios

```
firmware/
├── src/
│   ├── main.cpp               # Setup + 7 tareas FreeRTOS, globals, setup()/loop()
│   ├── tasks.h/.cpp           # Tareas FreeRTOS extraídas + helpers
│   ├── config.h               # Credenciales generadas (no commiteado)
│   ├── wifi_manager.h/.cpp    # Conexión WiFi (2 redes failover)
│   ├── http_poller.h/.cpp     # HTTP polling state machine, backoff (1s→60s)
│   ├── aht_sensor.h/.cpp      # AHT21 I2C 0x38 — temp/humedad, reset + reinit
│   ├── ens160_sensor.h/.cpp   # ENS160 I2C 0x53 — eCO₂/TVOC/AQI, calibración
│   ├── ssr_controller.h/.cpp  # SSR 4 canales active-LOW, timers minOn/maxOn
│   ├── hysteresis_controller.h/.cpp  # Reglas locales T/H/CO₂, modos LOCAL/REMOTE/OFF + NVS
│   ├── state_machine.h/.cpp   # 9 estados + SWDT + safe mode + NVS persistence
│   ├── mqtt_client.h/.cpp     # MQTT dual: HTTP commands + OTA subscribe
│   ├── ota_decisor.h/.cpp     # OTA conditions FSM (battery, temp, sensor state)
│   ├── ota_executor.h/.cpp    # OTA download, SHA-256 verify, flash inactive partition
│   ├── ota_shutdown.h/.cpp    # Safe shutdown: SSR off + sensor pause before OTA
│   ├── ota_postboot.h/.cpp    # Post-OTA self-test + mark_valid() or rollback
│   ├── thingspeak_client.h/.cpp # HTTP GET T/HR/CO₂/VOC cada 20s
│   ├── device_manager.h/.cpp  # Device ID derivado de MAC address
│   ├── event_bus.h/.cpp       # In-memory pub/sub (FreeRTOS Queue), 10 event types
│   ├── logger.h/.cpp          # Multi-sink logger (Serial, SPIFFS, MQTT) + ring buffer
│   ├── health_monitor.h/.cpp  # 7th task: heap, task stacks, I2C, sensor checks
│   └── telemetry_buffer.h/.cpp # RAM ring + SPIFFS spill offline buffer
├── test/                      # Pruebas unitarias (PIO Test)
├── platformio.ini             # Configuración PlatformIO
├── generate_config.py         # Genera config.h desde .env
├── partitions.csv             # Tabla de particiones (app0/app1/spiffs/coredump)
├── VERSION
└── package.json
```

---

## Módulos

| Módulo | Archivos | Descripción |
|---|---|---|
| Loop principal | `main.cpp` | Setup + globals, setup()/loop() |
| Tasks | `tasks.h/.cpp` | 7 tareas FreeRTOS extraídas + helpers |
| WiFi | `wifi_manager.h/.cpp` | Conexión con 2 redes failover |
| HTTP Poller | `http_poller.h/.cpp` | HTTP polling state machine, backoff (1s→60s) |
| Sensor AHT21 | `aht_sensor.h/.cpp` | I2C 0x38, temp/humedad, reset + reinit |
| Sensor ENS160 | `ens160_sensor.h/.cpp` | I2C 0x53, eCO₂/TVOC/AQI, calibración |
| SSR | `ssr_controller.h/.cpp` | 4 canales active-LOW, timers minOn/maxOn |
| Histéresis | `hysteresis_controller.h/.cpp` | Reglas locales T/H/CO₂, modos LOCAL/REMOTE/OFF, NVS setpoints |
| State Machine | `state_machine.h/.cpp` | 9 estados + watchdog software + safe mode + NVS persistence |
| MQTT Client | `mqtt_client.h/.cpp` | MQTT dual: HTTP command polling + OTA subscribe |
| OTA Decisor | `ota_decisor.h/.cpp` | OTA conditions FSM (battery, temp, sensors) |
| OTA Executor | `ota_executor.h/.cpp` | OTA download, SHA-256 verify, flash |
| OTA Shutdown | `ota_shutdown.h/.cpp` | Safe shutdown before OTA |
| OTA Post-Boot | `ota_postboot.h/.cpp` | Self-test + mark_valid() or rollback |
| ThingSpeak | `thingspeak_client.h/.cpp` | HTTP GET T/HR/CO₂/VOC cada 20s |
| Device Manager | `device_manager.h/.cpp` | Device ID desde MAC address |
| Event Bus | `event_bus.h/.cpp` | In-memory pub/sub (FreeRTOS Queue), 10 event types |
| Logger | `logger.h/.cpp` | Multi-sink (Serial, SPIFFS, MQTT), ring buffer 64 entries |
| Health Monitor | `health_monitor.h/.cpp` | 7th task: heap, task stacks, I2C, sensor checks |
| Telemetry Buffer | `telemetry_buffer.h/.cpp` | RAM ring (200 entries) + SPIFFS spill offline buffer |

---

## Tareas FreeRTOS

| Tarea | Core | Prioridad | Stack (words) | Delay (ms) | Función |
|---|---|---|---|---|---|
| taskSensors | 1 | `configMAX_PRIORITIES-1` | 8192 | 8000 | I2C AHT21 + ENS160 |
| taskSSR | 1 | `configMAX_PRIORITIES-2` | 4096 | 250 | Histéresis + actuadores + SWDT + eventBus.loop() |
| taskWiFi | 0 | `configMAX_PRIORITIES-3` | 4096 | 1000 | Conexión WiFi failover |
| taskPoller | 0 | `configMAX_PRIORITIES-4` | 8192 | 500 | HTTP polling backend |
| taskOTA | 0 | `configMAX_PRIORITIES-4` | 4096 | 100 | OTA updates |
| taskTelemetry | 0 | `configMAX_PRIORITIES-4` | 4096 | 5000 | ThingSpeak + stats + offline replay |
| taskMonitor | 0 | `configMAX_PRIORITIES-5` | 4096 | 60000/300000 | Health: heap, task stacks, I2C, sensor checks |

---

## Watchdog Jerárquico

| Nivel | Mecanismo | Timeout | Acción |
|---|---|---|---|
| 1 | TWDT (IDF Task WDT) | 12s | panic → abort → reboot |
| 2 | SWDT (StateMachine) | 30s | ESP.restart() + safe mode |
| 3 | Health Check | 60s | DEGRADED + recovery |

---

## Pinout (ESP32-S3-DevKitC-1)

| GPIO | Función |
|---|---|
| GPIO4 | I2C SDA (AHT21 + ENS160) |
| GPIO5 | I2C SCL (AHT21 + ENS160) |
| GPIO48 | LED RGB NeoPixel |
| GPIO11 | SSR CH1 — Ventilación |
| GPIO12 | SSR CH2 — Calefacción |
| GPIO13 | SSR CH3 — Humidificación |
| GPIO14 | SSR CH4 — Iluminación |

---

## Máquina de Estados

```
BOOT → INIT → WIFI → NORMAL ↔ DEGRADED
                       ↓          ↓
                     ERROR → RECOVERY → NORMAL
                       ↓
                      SAFE (5+ reboots → 60s wait + LED rojo)
```

| Estado | Descripción | Transición salida |
|---|---|---|
| BOOT | Inicio de CPU, GPIO, Serial | → INIT |
| INIT | Sensores I2C, NVS, watchdog | → WIFI o ERROR |
| WIFI | Conexión WiFi con failover | → NORMAL (ok) o ERROR (timeout) |
| NORMAL | Operación completa: sensores + SSR + HTTP | → DEGRADED (sensor fail) |
| DEGRADED | Sensor falla, actuadores funcionan con última lectura | → ERROR o NORMAL (recovery) |
| ERROR | Fallo crítico | → RECOVERY |
| RECOVERY | Intento de recuperación automático | → NORMAL o SAFE |
| SAFE | 5+ reboots consecutivos; espera 60s + LED rojo | → WIFI (tras espera) |

---

## Protocolo HTTP Polling

> Ver `docs/protocol/protocol-v1.md` y `docs/contracts/api-contract.md` para endpoints y formatos.

El firmware **no usa MQTT directamente**. La comunicación con el backend es íntegramente HTTP REST:

| Endpoint | Método | Frecuencia | Propósito |
|---|---|---|---|
| `/api/v1/telemetry` | POST | Cada 8s | Enviar lecturas de sensores |
| `/api/v1/devices/:id/poll` | GET | Cada 500ms | Obtener comandos pendientes |
| `/api/v1/devices/:id/ack` | POST | Por comando | Confirmar ejecución de comando |

El broker MQTT es utilizado por el **backend** para enrutar comandos y eventos en tiempo real hacia el frontend.

---

## OTA (Over-The-Air Update) — v3

> Ver `docs/ADR/ADR-014-OTA-v3.md` para decisiones de diseño detalladas.

Dos modalidades de actualización:

| Acción | Descripción |
|---|---|
| `activate` | Activa ArduinoOTA por 120s (flashear desde PlatformIO por WiFi) |
| `update` | Descarga firmware desde URL HTTP y flashea via `ESP32HTTPUpdate` |

**Comando HTTP:** `POST /api/v1/devices/{deviceId}/ota` con `{ "action": "activate"|"update", "url": "..." }`

Sistema de 4 capas con rollback nativo del bootloader:
1. **Decisor OTA** — FSM de condiciones (batería, temp, estado de sensores)
2. **Safe Shutdown** — Apaga SSR + pausa sensores antes de flashear
3. **Ejecutor OTA** — Descarga, verifica SHA-256 (mbedtls), flashea en partición inactiva
4. **Confirmación Post-Boot** — Self-test (WiFi, I2C, AHT21, heap) → `mark_valid()` o rollback automático

---

## Telemetría (Payload HTTP POST)

```json
{
  "deviceId": "esp32s3_001",
  "mac": "AA:BB:CC:DD:EE:FF",
  "fwVersion": "0.8.0",
  "uptime": 12345,
  "temperature": 24.5,
  "humidity": 85.2,
  "co2": 420,
  "voc": 15,
  "aqi": 1,
  "ssrState": [0, 0, 1, 0],
  "wifiRssi": -65,
  "state": "NORMAL",
  "protocol": "http-v1"
}
```

---

## Estrategia de Fallos

| Falla | Detección | Acción |
|---|---|---|
| WiFi desconectado | `WiFi.status() != WL_CONNECTED` | Reintentar cada 1s→60s (backoff), rotar redes |
| Backend HTTP error | `httpCode != 200` | Backoff progresivo, modo DEGRADED |
| Sensor I2C NACK | `!aht.begin()` o timeout | +1 contador, 3 fallas → DEGRADED |
| AHT21/ENS160 timeout | SWDT 30s | ESP.restart() + NVS counter++ |
| Crash / Watchdog TWDT | TWDT 12s | panic → reboot, NVS counter++ |
| 5 reboots seguidos | NVS counter > 5 | SAFE mode (60s wait + LED rojo) |

---

## Configuración (config.h)

Generado automáticamente por `generate_config.py` desde `.env`. **Nunca se commitea.**

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID_1    "red_principal"
#define WIFI_PASSWORD_1 "****"
#define WIFI_SSID_2    "red_backup"
#define WIFI_PASSWORD_2 "****"

// Backend HTTP
#define BACKEND_HOST   "192.168.1.100"
#define BACKEND_PORT   3797
#define API_KEY        "****"  // X-Device-Key

// ThingSpeak
#define TS_HOST        "api.thingspeak.com"
#define TS_PORT        80
#define TS_API_KEY     "****"

// MQTT (usado por backend, no por firmware directamente)
#define DEVICE_ID      "esp32s3_001"

// SSR (active-LOW)
#define SSR1_PIN 11   // CH1 — Ventilación
#define SSR2_PIN 12   // CH2 — Calefacción
#define SSR3_PIN 13   // CH3 — Humidificación
#define SSR4_PIN 14   // CH4 — Iluminación
#define SSR_ACTIVE_LOW 1

// Intervalos (ms)
#define SENSOR_INTERVAL  8000
#define TS_INTERVAL     20000
#define POLL_INTERVAL     500

#endif
```

---

## Referencias

- `docs/protocol/protocol-v1.md` — Protocolo HTTP polling
- `docs/contracts/api-contract.md` — Endpoints REST
- `docs/ADR/ADR-017-Event-Bus.md` — Event Bus in-memory
- `docs/ADR/ADR-014-OTA-v3.md` — Sistema OTA 4 capas
- `docs/ADR/ADR-012-FreeRTOS.md` — Decisión FreeRTOS
- `docs/ADR/ADR-010-Mecanismo-Fail-Safe-Overheat.md` — Fail-safe overheat
