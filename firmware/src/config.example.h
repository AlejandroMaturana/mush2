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

// ---- Environment ----
#define ENV_DEVELOPMENT 0
#define ENV_STAGING     1
#define ENV_PRODUCTION  2

#ifndef MUSH_ENV
#define MUSH_ENV ENV_DEVELOPMENT
#endif

// ---- MQTT ----
#ifndef MQTT_BROKER
  #if MUSH_ENV == ENV_PRODUCTION
    #define MQTT_BROKER "mqtt.your-domain.tld"
  #elif MUSH_ENV == ENV_STAGING
    #define MQTT_BROKER "mqtt-staging.your-domain.tld"
  #else
    #define MQTT_BROKER "test.mosquitto.org"
  #endif
#endif

#ifndef MQTT_PORT
  #if MUSH_ENV == ENV_DEVELOPMENT
    #define MQTT_PORT 1883
  #else
    #define MQTT_PORT 8883
  #endif
#endif

#ifndef MQTT_USER
#define MQTT_USER "device_001"
#endif

#ifndef MQTT_PASS
#define MQTT_PASS "change_me"
#endif

#ifndef MQTT_USE_TLS
  #if MUSH_ENV == ENV_DEVELOPMENT
    #define MQTT_USE_TLS 0
  #else
    #define MQTT_USE_TLS 1
  #endif
#endif

// ---- MQTT Reconnection ----
#ifndef MQTT_RECONNECT_INITIAL_MS
#define MQTT_RECONNECT_INITIAL_MS 5000UL
#endif
#ifndef MQTT_RECONNECT_MAX_MS
#define MQTT_RECONNECT_MAX_MS 300000UL
#endif
#ifndef MQTT_HANDSHAKE_TIMEOUT_MS
#define MQTT_HANDSHAKE_TIMEOUT_MS 5000UL
#endif

// ---- MQTT TLS CA Root Certificate ----
// ISRG Root X1 (Let's Encrypt) — valido hasta 2035
// https://letsencrypt.org/certificates/
static const char MQTT_CA_ROOT[] PROGMEM = R"(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6
UA5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+s
WT8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qy
HB5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4xKK4gNk7T1dEWQI2Z
AgMBAAGjggEzMIIBLzAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjAd
BadNVNSsV4JTkZ7OQGGC0R4dU0YzV0IF3oCkE4pD2fYMHeLHt8tQhIz0Jh2dN4W
-----END CERTIFICATE-----
)";

// ---- NTP ----
#ifndef NTP_SERVER
#define NTP_SERVER "pool.ntp.org"
#endif

// ---- Device ----
#ifndef DEVICE_ID
#define DEVICE_ID "mush2_s3_001"
#endif
#ifndef HW_REVISION
#define HW_REVISION "1.0"
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

// ---- SSR 4 Canales (active-LOW por defecto) ----
#define SSR_CH1_PIN GPIO_NUM_11   // Ventilación
#define SSR_CH2_PIN GPIO_NUM_12   // Calefacción (manta térmica)
#define SSR_CH3_PIN GPIO_NUM_13   // Humidificación
#define SSR_CH4_PIN GPIO_NUM_14   // Iluminación (fotoperiodo)

// Valor por defecto para SSR_ACTIVE_LOW (1=low-level, 0=high-level).
// Se sobreescribe en tiempo de ejecución desde NVS (BLE provisioning o backend).
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

// ---- Multi-Function Button (SMFB) ----
// Active LOW: pull-up interno, boton corta a GND al presionar.
// Si BUTTON_PIN es -1, el task no se crea (dispositivo sin boton fisico).
#define BUTTON_PIN             GPIO_NUM_6
#define BUTTON_DEBOUNCE_MS     20
#define BUTTON_CLICK_MAX_MS    300
#define BUTTON_DOUBLE_GAP_MS   300
#define BUTTON_HOLD_3S_MS      3000
#define BUTTON_HOLD_10S_MS     10000
#define BUTTON_TASK_STACK      3072
#define BUTTON_TASK_PRIORITY   2
#define BUTTON_TASK_DELAY_MS   10

// ---- Intervals (ms) ----
#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 20000
#define POLL_INTERVAL 5000

// ---- WDT ----
#define TASK_WDT_TIMEOUT 10

// ---- Fail-safe overheat thresholds ----
#define TEMP_CRITICAL 32.0
#define TEMP_RECOVERY 28.0

// ---- Adaptive Sensor Frequency ----
#ifndef SENSOR_FREQ_MIN_MS
#define SENSOR_FREQ_MIN_MS 5000
#endif
#ifndef SENSOR_FREQ_MAX_MS
#define SENSOR_FREQ_MAX_MS 30000
#endif
#ifndef SENSOR_STABILITY_THRESHOLD
#define SENSOR_STABILITY_THRESHOLD 10
#endif
#ifndef SENSOR_INSTABILITY_THRESHOLD
#define SENSOR_INSTABILITY_THRESHOLD 3
#endif

// ---- I2C Recovery Trending ----
#ifndef I2C_RECOVERY_TREND_WINDOW
#define I2C_RECOVERY_TREND_WINDOW 16
#endif
#ifndef I2C_PREDICTIVE_THRESHOLD
#define I2C_PREDICTIVE_THRESHOLD 5
#endif

// ---- MQTT Command Buffer ----
#ifndef MQTT_CMD_BUFFER_SIZE
#define MQTT_CMD_BUFFER_SIZE 32
#endif
#ifndef MQTT_CMD_TTL_MS
#define MQTT_CMD_TTL_MS 300000UL
#endif

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

// ---- NVS Actuator Hold Window (ms) ----
#ifndef ACTUATOR_HOLD_WINDOW_MS
#define ACTUATOR_HOLD_WINDOW_MS 300000UL
#endif

// ---- BLE Provisioning ----
#ifndef BLE_PROV_TIMEOUT_MS
#define BLE_PROV_TIMEOUT_MS 300000
#endif
#ifndef BLE_DEVICE_NAME_PREFIX
#define BLE_DEVICE_NAME_PREFIX "Mush2"
#endif

// ---- WiFi Re-provisioning ----
#ifndef WIFI_FAIL_REPROVISION_THRESHOLD
#define WIFI_FAIL_REPROVISION_THRESHOLD 5
#endif

// ---- Debug ----
#ifndef POLL_DEBUG
#define POLL_DEBUG 0
#endif

#endif
