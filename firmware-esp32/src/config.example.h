#ifndef CONFIG_EXAMPLE_H
#define CONFIG_EXAMPLE_H

// ============================================================
//  CONFIG.EXAMPLE.H — Mush2 para ESP32-S3 (DevKit rev1.0)
//  Template de configuración. Copia este archivo como base y
//  completa tus credenciales en config.h (está en .gitignore).
// ============================================================

// ---- WiFi ----
#ifndef WIFI_SSID_1
#define WIFI_SSID_1 "your_ssid_1"
#endif
#ifndef WIFI_PASSWORD_1
#define WIFI_PASSWORD_1 "your_password_1"
#endif
#ifndef WIFI_SSID_2
#define WIFI_SSID_2 "your_ssid_2"
#endif
#ifndef WIFI_PASSWORD_2
#define WIFI_PASSWORD_2 "your_password_2"
#endif

// ---- ThingSpeak ----
#ifndef TS_HOST
#define TS_HOST "api.thingspeak.com"
#endif
#define TS_PORT 80
#ifndef TS_API_KEY
#define TS_API_KEY "your_ts_api_key"
#endif

// ---- MQTT ----
#ifndef MQTT_BROKER
#define MQTT_BROKER "test.mosquitto.org"
#endif
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
#ifndef MQTT_BROKER_FALLBACK
#define MQTT_BROKER_FALLBACK "broker.hivemq.com"
#endif
#ifndef MQTT_PORT_FALLBACK
#define MQTT_PORT_FALLBACK 1883
#endif

// ---- Device ----
#ifndef DEVICE_ID
#define DEVICE_ID "mush2_s3_001"
#endif

// ---- Backend HTTP ----
#ifndef BACKEND_HOST
#define BACKEND_HOST "192.168.1.6"
#endif
#ifndef BACKEND_PORT
#define BACKEND_PORT 3797
#endif

// ---- I2C (Sensores ENS160 + AHT21) ----
#define I2C_SDA GPIO_NUM_4
#define I2C_SCL GPIO_NUM_5
#define I2C_FREQ 100000

// ---- LED RGB Integrado (NeoPixel/WS2812B) ----
#define LED_RGB_PIN GPIO_NUM_48
#define LED_RGB_COUNT 1
#define LED_RGB_BRIGHTNESS 24

// ---- SSR 4 Canales (active-LOW) ----
#define SSR_CH1_PIN GPIO_NUM_11   // Ventilación
#define SSR_CH2_PIN GPIO_NUM_12   // Calefacción (manta térmica)
#define SSR_CH3_PIN GPIO_NUM_13   // Humidificación
#define SSR_CH4_PIN GPIO_NUM_14   // Iluminación (fotoperiodo)

#define SSR_ACTIVE_LOW 1

// ---- FreeRTOS: Core Pinning ----
#define CORE_CONTROL   1
#define CORE_NETWORK   0

// ---- FreeRTOS: Stack Sizes (words) ----
#define STACK_SENSORS   4096
#define STACK_SSR       4096
#define STACK_WIFI      4096
#define STACK_MQTT      4096
#define STACK_OTA       8192
#define STACK_TELEMETRY 4096
#define STACK_POLLER    8192

// ---- FreeRTOS: Task Priorities ----
#define PRIORITY_SENSORS    3
#define PRIORITY_SSR        2
#define PRIORITY_WIFI       1
#define PRIORITY_MQTT       1
#define PRIORITY_OTA        1
#define PRIORITY_TELEMETRY  1

// ---- FreeRTOS: Task Delays (ms) ----
#define DELAY_SENSORS   5000
#define DELAY_SSR       250
#define DELAY_WIFI      1000
#define DELAY_MQTT      500
#define DELAY_OTA       100
#define DELAY_TELEMETRY 5000
#define DELAY_POLLER    500

// ---- Intervals (ms) ----
#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 20000
#define POLL_INTERVAL 5000

// ---- WDT ----
#define TASK_WDT_TIMEOUT 10

// ---- Fail-safe overheat thresholds ----
#define TEMP_CRITICAL 32.0
#define TEMP_RECOVERY 28.0

// ---- Post-humidification timing (ms) ----
#define POST_VENT_DELAY 10000
#define POST_VENT_DURATION 30000

// ---- Illumination photoperiod defaults (ms) ----
#define LIGHT_CYCLE_MS 43200000UL
#define DARK_CYCLE_MS 43200000UL

// ---- Default hysteresis setpoints (Reishi/Lion's Mane range) ----
#define DEFAULT_TEMP_MIN 20.0
#define DEFAULT_TEMP_MAX 24.0
#define DEFAULT_HUM_MIN 78.0
#define DEFAULT_HUM_MAX 85.0
#define DEFAULT_CO2_MAX 1200

// ---- BLE Provisioning ----
#ifndef BLE_PROV_TIMEOUT_MS
#define BLE_PROV_TIMEOUT_MS 300000
#endif
#ifndef BLE_DEVICE_NAME_PREFIX
#define BLE_DEVICE_NAME_PREFIX "Mush2"
#endif

// ---- Debug ----
#ifndef POLL_DEBUG
#define POLL_DEBUG 0
#endif

#endif
