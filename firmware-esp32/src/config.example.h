#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
//  CONFIG.H — Mush2 para ESP32-S3 (DevKit rev1.0)
//  Copia este archivo como config.h y completa tus credenciales
// ============================================================

// ---- WiFi ----
#define WIFI_SSID_1 "your_ssid_1"
#define WIFI_PASSWORD_1 "your_password_1"
#define WIFI_SSID_2 "your_ssid_2"
#define WIFI_PASSWORD_2 "your_password_2"

// ---- ThingSpeak ----
#define TS_HOST "api.thingspeak.com"
#define TS_PORT 80
#define TS_API_KEY "your_ts_api_key"

// ---- MQTT ----
#define MQTT_BROKER "test.mosquitto.org"
#define MQTT_PORT 1883
#define MQTT_BROKER_FALLBACK "broker.hivemq.com"
#define MQTT_PORT_FALLBACK 1883

// ---- Device ----
#define DEVICE_ID "mush2_s3_001"

// ---- I2C (Sensores ENS160 + AHT21) ----
#define I2C_SDA GPIO_NUM_4
#define I2C_SCL GPIO_NUM_5
#define I2C_FREQ 100000

// ---- LED RGB Integrado (NeoPixel/WS2812B) ----
#define LED_RGB_PIN GPIO_NUM_48
#define LED_RGB_COUNT 1
#define LED_RGB_BRIGHTNESS 64

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
#define STACK_SENSORS  4096
#define STACK_SSR      4096
#define STACK_WIFI     4096
#define STACK_MQTT     4096
#define STACK_OTA      4096
#define STACK_TELEMETRY 4096

// ---- FreeRTOS: Task Priorities ----
#define PRIORITY_SENSORS    configMAX_PRIORITIES - 1
#define PRIORITY_SSR        configMAX_PRIORITIES - 2
#define PRIORITY_WIFI       configMAX_PRIORITIES - 3
#define PRIORITY_MQTT       configMAX_PRIORITIES - 3
#define PRIORITY_OTA        configMAX_PRIORITIES - 4
#define PRIORITY_TELEMETRY  configMAX_PRIORITIES - 4

// ---- FreeRTOS: Task Delays (ms) ----
#define DELAY_SENSORS   10000
#define DELAY_SSR       250
#define DELAY_WIFI      1000
#define DELAY_MQTT      50
#define DELAY_OTA       100
#define DELAY_TELEMETRY 20000

// ---- Intervals (ms) ----
#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 20000

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

#endif
