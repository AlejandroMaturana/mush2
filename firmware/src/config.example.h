#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID_1 "your_ssid_1"
#define WIFI_PASSWORD_1 "your_password_1"
#define WIFI_SSID_2 "your_ssid_2"
#define WIFI_PASSWORD_2 "your_password_2"

#define TS_HOST "api.thingspeak.com"
#define TS_PORT 80
#define TS_API_KEY "your_ts_api_key"

#define MQTT_BROKER "test.mosquitto.org"
#define MQTT_PORT 1883
#define MQTT_BROKER_FALLBACK "broker.hivemq.com"
#define MQTT_PORT_FALLBACK 1883

#define DEVICE_ID "esp8266_001"

#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 20000
#define MQTT_KEEPALIVE 30

#define SSR_ACTIVE_HIGH 1
#define SSR1_PIN D2
#define SSR2_PIN D4
#define SSR3_PIN D6

#endif
