# Firmware — Mush2

> Plataforma: ESP8266 (LOLIN WeMos D1 R1)
> Framework: Arduino
> Board PlatformIO: `d1`

## Módulos

| Módulo | Archivo | Descripción |
|---|---|---|
| Loop principal | `main.ino` | Setup + loop: sensores, MQTT, SSR, histéresis, OTA, ThingSpeak |
| WiFi | `wifi_manager.h/.cpp` | Conexión con 2 redes failover |
| MQTT | `mqtt_handler.h/.cpp` | PubSubClient con 2 brokers, exponential backoff (5s→180s), LWT |
| Sensores AHT21 | `aht_sensor.h/.cpp` | I2C 0x38, temp/humedad, reset + reinit automático ante fallos |
| Sensores ENS160 | `ens160_sensor.h/.cpp` | I2C 0x53, eCO₂/TVOC/AQI, calibración con T/H del AHT21 |
| SSR | `ssr_controller.h/.cpp` | 3 canales (D5, D7, D6), temporizadores minOn/maxOn, activeHigh |
| Histéresis | `hysteresis_controller.h/.cpp` | Reglas locales T/H/CO2, modos LOCAL/REMOTE/OFF |
| State Machine | `state_machine.h/.cpp` | BOOT→INIT→WIFI→NORMAL→DEGRADED→ERROR→RECOVERY→SAFE |
| OTA | `ota_handler.h/.cpp` | ArduinoOTA + HTTP Update via MQTT |
| ThingSpeak | `thingspeak_client.h/.cpp` | HTTP GET con T/HR/CO2/VOC cada 20s |

## Pinout

| Pin | GPIO | Función |
|---|---|---|
| D1 | GPIO5 | I2C SCL |
| D2 | GPIO4 | I2C SDA |
| D5 | GPIO14 | SSR1 — Calefacción |
| D7 | GPIO13 | SSR2 — Ventilación |
| D6 | GPIO12 | SSR3 — Humidificación |

## Máquina de Estados

```
BOOT → INIT → WIFI → NORMAL ↔ DEGRADED
                        ↓          ↓
                      ERROR → RECOVERY → NORMAL
                        ↓
                       SAFE (5+ reboots → 60s wait)
```

## Protocolo MQTT

Ver `docs/protocol/protocol-v1.md` para tópicos y formatos.

## OTA

Dos modos:
- `activate`: Activa ArduinoOTA por 120s (ideal para flashear desde PlatformIO por WiFi)
- `update`: Descarga firmware desde URL HTTP y flashea via `ESP8266HTTPUpdate`

Comando: `mush2/cmd/{deviceId}/ota` con `{ "action": "activate"|"update", "url": "..." }`
