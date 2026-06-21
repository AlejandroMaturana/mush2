# Arquitectura del Firmware — Mush2

## Hardware Objetivo

| Componente | Modelo | Interfaz |
|---|---|---|
| MCU | ESP8266 (ESP-12F / WeMos D1 Mini) | — |
| Temp/Humedad | AHT21 (antes DHT11) | I2C (0x38) |
| CO2/VOC | ENS160 | I2C (0x53) |
| Relés SSR | SSR 4 canales (active-high configurable) | GPIO (D5, D7, D6, D0) |

## Stack

| Capa | Herramienta |
|---|---|
| Framework | Arduino Core for ESP8266 |
| Build System | PlatformIO |
| Lenguaje | C++11 |
| MQTT Cliente | PubSubClient |
| WiFi | ESP8266WiFi + EEPROM |
| Watchdog | ESP8266Watchdog + software timer |
| Serial | 115200 baud (logs de diagnóstico) |

## Estructura de Directorios

```
firmware/
├── src/
│   ├── main.ino               # Setup + loop
│   ├── config.h                # Credenciales generadas
│   ├── wifi_manager.h/.cpp     # Conexión WiFi (2 redes failover)
│   ├── mqtt_handler.h/.cpp     # Cliente MQTT (2 brokers failover)
│   ├── dht_sensor.h/.cpp       # Reader AHT21 (antes DHT11)
│   ├── ens160_sensor.h/.cpp    # Sensor CO2/VOC
│   ├── ssr_controller.h/.cpp   # Control de relés SSR
│   ├── thingspeak_client.h/.cpp # HTTP GET a ThingSpeak
│   ├── watchdog.h/.cpp         # Watchdog + EEPROM contador
│   └── state_machine.h/.cpp    # Máquina de estados del dispositivo
├── lib/                        # Librerías externas
├── test/                       # Pruebas unitarias
├── platformio.ini              # Configuración PlatformIO
├── generate_config.py          # Genera config.h desde .env
├── VERSION
└── CHANGELOG.md
```

## Diagrama de Módulos

```
                     ┌─────────────────────┐
                     │      main.ino        │
                     │  setup() + loop()    │
                     └────┬────────┬───────┘
                          │        │
               ┌──────────▼──┐ ┌──▼───────────┐
               │ wifi_manager │ │ state_machine │
               │ WiFi conexión│ │ Estados:      │
               │ 2 redes      │ │ BOOT→INIT→   │
               │ failover     │ │ WIFI→NORMAL→ │
               └──────────────┘ │ DEGRADED→    │
                                │ ERROR→RECOVERY│
                                └──────┬───────┘
          ┌─────────────────────────────┤
          │              │              │           │
    ┌─────▼──────┐ ┌────▼──────┐ ┌─────▼─────┐ ┌──▼──────────┐
    │ dht_sensor  │ │ens160_sens│ │ssr_control │ │ mqtt_handler│
    │ AHT21 I2C   │ │ ENS160 I2C│ │4 canales   │ │PubSubClient │
    │ 0x38        │ │ 0x53      │ │GPIO D5/D7/D6/D0│2 brokers    │
    └─────────────┘ └───────────┘ └────────────┘ └──────┬──────┘
                                                         │
                                              ┌──────────▼──────┐
                                              │ thingspeak_client│
                                              │ HTTP GET telemetría│
                                              └─────────────────┘
```

## Pinout (WeMos D1 Mini)

| Pin | Señal | Conexión |
|---|---|---|
| D1 (GPIO5) | SCL | AHT21 + ENS160 SCL |
| D2 (GPIO4) | SDA | AHT21 + ENS160 SDA |
| D5 (GPIO14) | SSR1 | Relé canal 1 — Ventilación |
| D7 (GPIO13) | SSR2 | Relé canal 2 — Calefacción |
| D6 (GPIO12) | SSR3 | Relé canal 3 — Humidificación |
| D0 (GPIO16) | SSR4 | Relé canal 4 — Humidificación |
| 3.3V | VCC | Sensores |
| GND | GND | Común |

## Máquina de Estados

```
                  ┌──────────┐
                  │   BOOT   │
                  └────┬─────┘
                       │ CPU init, GPIO, Serial
                  ┌────▼─────┐
                  │   INIT   │
                  └────┬─────┘
                       │ Sensores I2C, watchdog
                       │
                ┌──────▼──────┐
                │    WIFI     │◄────────────┐
                └──────┬──────┘             │
                       │ Conectado?         │
                  ┌────▼─────┐              │
                  │  NORMAL  │              │
                  └────┬─────┘              │
                       │ Lectura 10s         │
                  ┌────▼─────┐              │
                  │ DEGRADED │── Sensor fail─┤
                  └────┬─────┘              │
                       │ Recuperar sensor?   │
                  ┌────▼─────┐              │
                  │  ERROR   │── Crítico ────┤
                  └────┬─────┘              │
                       │ Auto-reboot         │
                  ┌────▼─────┐              │
                  │ RECOVERY │──────────────┘
                  └──────────┘
```

## Ciclo Principal (loop())

```cpp
void loop() {
    watchdog_reset();

    // 1. Gestionar conexiones
    processWiFi();       // Reconexión si es necesario
    processMQTT();       // Mantener alive + procesar mensajes

    // 2. Leer sensores (cada 20s)
    if (millis() - lastSensorRead > SENSOR_INTERVAL) {
        readSensors();
        publishTelemetry();
        sendToThingSpeak();
        lastSensorRead = millis();
    }

    // 3. Control local (histeresis)
    evaluateLocalRules();

    // 4. Mantener actuadores (timers de seguridad)
    updateActuators();
}
```

## Estrategia de Fallos

| Falla | Detección | Acción |
|---|---|---|
| WiFi desconectado | `WiFi.status() != WL_CONNECTED` | Reintentar cada 5s, rotar redes |
| MQTT desconectado | `!mqttClient.connected()` | Reintentar cada 10s, rotar brokers |
| Sensor I2C error | `!aht.begin()` o NACK | Incrementar contador, modo DEGRADED |
| AHT21/ENS160 timeouts | Watchdog software 30s | Reinicio suave |
| Crash | Watchdog hardware 8s | Reinicio duro, contador EEPROM+1 |
| 5 reinicios seguidos | Contador EEPROM > 5 | Modo SAFE (solo WiFi, espera comando) |

## Telemetría (MQTT Payload)

```json
{
  "deviceId": "esp8266_001",
  "mac": "AA:BB:CC:DD:EE:FF",
  "fwVersion": "0.1.0",
  "uptime": 12345,
  "temperature": 24.5,
  "humidity": 85.2,
  "co2": 420,
  "voc": 15,
  "ssrState": [0, 0, 1, 0],
  "wifiRssi": -65,
  "state": "NORMAL"
}
```

## Configuración (config.h)

Generado automáticamente por `generate_config.py` desde `.env`:

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID_1 "fh_8d5bf8"
#define WIFI_PASSWORD_1 "wlan72a407"
#define WIFI_SSID_2 "ZTE_4ED1E6"
#define WIFI_PASSWORD_2 "99897250"

// ThingSpeak
#define TS_HOST "api.thingspeak.com"
#define TS_PORT 80
#define TS_API_KEY "TY6A9CJQSNC1BHK2"

// MQTT
#define MQTT_BROKER "test.mosquitto.org"
#define MQTT_PORT 1883
#define MQTT_BROKER_FALLBACK "broker.hivemq.com"
#define MQTT_PORT_FALLBACK 1883

// Dispositivo
#define DEVICE_ID "esp8266_001"
#define DHT_PIN D5

// SSR
#define SSR_ACTIVE_HIGH 1
#define SSR1_PIN D5  // CH1 — Ventilación
#define SSR2_PIN D7  // CH2 — Calefacción (evita LED_BUILTIN en D4)
#define SSR3_PIN D6  // CH3 — Humidificación
#define SSR4_PIN D0  // CH4 — Humidificación

// Intervalos (ms)
#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 15000
#define MQTT_KEEPALIVE 30

#endif
```
