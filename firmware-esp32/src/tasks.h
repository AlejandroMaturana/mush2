#ifndef TASKS_H
#define TASKS_H

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <esp_task_wdt.h>
#include "config.h"

// Module includes used by tasks
#include "state_machine.h"
#include "wifi_manager.h"
#include "http_poller.h"
#include "ota_handler.h"
#include "ota_decisor.h"
#include "ota_nvs.h"
#include "ota_shutdown.h"
#include "ota_executor.h"
#include "ota_postboot.h"
#include "aht_sensor.h"
#include "ens160_sensor.h"
#include "ssr_controller.h"
#include "hysteresis_controller.h"
#include "thingspeak_client.h"
#include "mqtt_client.h"
#include "event_bus.h"
#include "logger.h"
#include "telemetry_buffer.h"
#include "actuator_nvs.h"
#include "ble_provisioning.h"

// ============================================================
//  Global objects (defined in main.ino)
// ============================================================
extern WiFiManager wifi;
extern StateMachine sm;
extern HTTPPoller httpPoller;
extern OTAHandler ota;
extern OTASelector otaselector;
extern OTAShutdown otaShutdown;
extern OTAExecutor otaExecutor;
extern OTAConfirmation otaConfirmacion;
extern AHTSensor aht;
extern EnsSensor ens;
extern SSRController ssr;
extern HysteresisController hyst;
extern ThingSpeakClient ts;
extern MQTTClient mqtt;
extern BLEProvisioning bleProv;
extern Adafruit_NeoPixel led;

// ============================================================
//  Shared state (accessed across cores, declared volatile)
// ============================================================
extern volatile float sharedTemp;
extern volatile float sharedHum;
extern volatile uint16_t sharedEco2;
extern volatile uint16_t sharedTvoc;
extern volatile uint8_t sharedAqi;
extern volatile bool sharedSensorsValid;
extern volatile bool sharedEnsValid;
extern volatile bool sharedOverheatActive;
extern volatile bool sharedLightOn;
extern volatile unsigned long sharedUptime;
extern volatile unsigned long bootTime;
extern volatile unsigned long lightCycleStart;
extern volatile float fallbackTemp;
extern volatile float fallbackHum;
extern volatile float lastValidTemp;
extern volatile float lastValidHum;
extern volatile bool fallbackActive;
extern volatile unsigned long sensorFailCount;
extern volatile bool sensorFailed;
extern volatile bool ntpSynced;
extern char sharedMac[18];
extern char sharedFwVer[20];
extern char sharedHwRev[10];

// Actuator desired states (written by Core 0, read by Core 1)
extern volatile uint8_t actuatorDesired[4];
extern volatile uint8_t actuatorMode[4];

// NVS persistence
extern volatile bool provisionalMode;
extern volatile unsigned long lastActuatorPersist;
extern uint32_t holdWindow[4];

// OTA command state (set by serial or MQTT)
extern volatile bool otaCommandPending;
extern char otaCommandUrl[256];
extern char otaCommandVersion[32];
extern char otaCommandHash[65];

// ============================================================
//  Task handles (defined in main.ino)
// ============================================================
extern TaskHandle_t taskSensorsHandle;
extern TaskHandle_t taskSSRHandle;
extern TaskHandle_t taskWiFiHandle;
extern TaskHandle_t taskPollerHandle;
extern TaskHandle_t taskOTAHandle;
extern TaskHandle_t taskTelemetryHandle;
extern TaskHandle_t taskMQTTHandle;

// ============================================================
//  Task entry points (implemented in tasks.cpp)
// ============================================================
void taskSensors(void* pvParameters);
void taskSSR(void* pvParameters);
void taskWiFi(void* pvParameters);
void taskPoller(void* pvParameters);
void taskOTA(void* pvParameters);
void taskMQTT(void* pvParameters);
void taskTelemetry(void* pvParameters);
void taskProvisioningIdle(void* pvParameters);

// ============================================================
//  Helper functions (implemented in tasks.cpp)
// ============================================================
void setLEDColor(uint8_t r, uint8_t g, uint8_t b);
void processPhotoperiod();
time_t getTimestamp();
void otaMqttCallback(const char* url, const char* version, const char* hash);
void mqttActuatorCallback(const MqttActuatorMessage* msg);

#endif
