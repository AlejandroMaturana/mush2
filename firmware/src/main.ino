#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_NeoPixel.h>
#include <esp_task_wdt.h>
#include <time.h>
#include <esp_sntp.h>
#include <esp_timer.h>
#include "config.h"
#include "wifi_manager.h"
#include "state_machine.h"
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
#include "device_manager.h"
#include "mqtt_client.h"
#include "ble_provisioning.h"
#include "actuator_nvs.h"
#include "event_bus.h"
#include "logger.h"
#include "health_monitor.h"
#include "telemetry_buffer.h"
#include "button_driver.h"
#include "button_fsm.h"
#include "button_handler.h"
#include "boot_test.h"
#include "sensor_registry.h"
#include "tasks.h"

// ============================================================
//  Global instances
// ============================================================
WiFiManager wifi;
StateMachine sm;
DeviceManager deviceManager;
HTTPPoller httpPoller;
OTAHandler ota;
OTASelector otaselector;
OTAShutdown otaShutdown;
OTAExecutor otaExecutor;
OTAConfirmation otaConfirmacion;
AHTSensor aht;
EnsSensor ens;
SSRController ssr;
HysteresisController hyst;
ThingSpeakClient ts;
MQTTClient mqtt;
BLEProvisioning bleProv;
Adafruit_NeoPixel led(LED_RGB_COUNT, LED_RGB_PIN, NEO_GRB + NEO_KHZ800);
SensorRegistry sensorRegistry;
BootTest bootTest;
BootTestResult bootResult;

// ============================================================
//  Shared state (accessed across cores, declared volatile)
// ============================================================
volatile float sharedTemp = 0;
volatile float sharedHum = 0;
volatile uint16_t sharedEco2 = 0;
volatile uint16_t sharedTvoc = 0;
volatile uint8_t sharedAqi = 0;
volatile bool sharedSensorsValid = false;
volatile bool sharedEnsValid = false;
volatile bool sharedOverheatActive = false;
volatile bool sharedLightOn = true;
volatile unsigned long sharedUptime = 0;
volatile unsigned long bootTime = 0;
volatile unsigned long lightCycleStart = 0;
volatile float fallbackTemp = 0;
volatile float fallbackHum = 0;
volatile float lastValidTemp = 0;
volatile float lastValidHum = 0;
volatile bool fallbackActive = false;
volatile unsigned long sensorFailCount = 0;
volatile bool sensorFailed = false;
volatile bool ntpSynced = false;
volatile uint32_t wifiFailCount = 0;
char sharedMac[18] = "";
char sharedFwVer[20] = "";
char sharedHwRev[10] = "";

// Actuator desired states (written by Core 0, read by Core 1)
volatile uint8_t actuatorDesired[4] = {0, 0, 0, 0};
volatile uint8_t actuatorMode[4] = {0, 0, 0, 0};

// NVS persistence
volatile bool provisionalMode = false;
volatile int64_t lastActuatorPersist = 0;
uint32_t holdWindow[4] = {ACTUATOR_HOLD_WINDOW_MS, ACTUATOR_HOLD_WINDOW_MS, ACTUATOR_HOLD_WINDOW_MS, ACTUATOR_HOLD_WINDOW_MS};

// Task handles
TaskHandle_t taskSensorsHandle = NULL;
TaskHandle_t taskSSRHandle = NULL;
TaskHandle_t taskWiFiHandle = NULL;
TaskHandle_t taskPollerHandle = NULL;
TaskHandle_t taskOTAHandle = NULL;
TaskHandle_t taskTelemetryHandle = NULL;
TaskHandle_t taskMQTTHandle = NULL;
TaskHandle_t taskButtonHandle = NULL;

// OTA command state (set by serial or MQTT)
volatile bool otaCommandPending = false;
char otaCommandUrl[256] = "";
char otaCommandVersion[32] = "";
char otaCommandHash[65] = "";

// ============================================================
//  NTP sync callback
// ============================================================

static void ntpSyncCallback(struct timeval* tv) {
  ntpSynced = true;
  Serial.printf("[NTP] Sincronizado: %ld\n", tv->tv_sec);
}

// ============================================================
//  Setup
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n[Mush2-ESP32S3] Iniciando...");

  esp_task_wdt_init(TASK_WDT_TIMEOUT, true);

  // LED RGB
  led.begin();
  led.setBrightness(LED_RGB_BRIGHTNESS);
  setLEDColor(128, 0, 128);

  sm.init();

  // Initialize EventBus and Logger (foundation infrastructure)
  eventBus.init();
  firmwareLogger.init();
  firmwareLogger.addSink(new SerialSink());

  SpiffsSink* spiffsSink = new SpiffsSink();
  firmwareLogger.addSink(spiffsSink);

  LOG_I("BOOT", "Mush2-ESP32S3 v%s iniciando...", FIRMWARE_VERSION);

  if (sm.isSafeMode()) {
    Serial.println("[SAFE] Modo seguro — 5+ reinicios consecutivos. Esperando 60s...");
    setLEDColor(255, 0, 0);
    for (int i = 0; i < 120; i++) {
      esp_task_wdt_reset();
      vTaskDelay(pdMS_TO_TICKS(500));
    }
    sm.fsmTransition(ST_INIT, "safe mode recovery");
  }

  deviceManager.init();
  nvsInit();

  // Inicializar componentes OTA v3
  otaselector = OTASelector();
  otaShutdown = OTAShutdown();
  otaShutdown.init(&ssr);
  otaExecutor = OTAExecutor();
  otaConfirmacion = OTAConfirmation();
  otaConfirmacion.init(&sm);

  // Inicializar BLE provisioning
  bleProv.init(deviceManager.getDeviceId().c_str(), FIRMWARE_VERSION);

  if (bleProv.isProvisioned()) {
    // === MODO NORMAL: credenciales disponibles ===
    Serial.println("[BOOT] Credenciales encontradas — modo operativo");

    String provSsid, provPass;
    bleProv.getStoredCredentials(provSsid, provPass);
    wifi.setProvisionedCredentials(provSsid, provPass);

    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(I2C_FREQ);

    sm.fsmTransition(ST_WIFI, "setup");
    wifi.init();
    wifi.connect();

    // NTP background sync (non-blocking)
    sntp_set_time_sync_notification_cb(ntpSyncCallback);
    configTime(0, 0, NTP_SERVER);

    // Run boot self-test
    bootTest.init();
    bootResult = bootTest.run();

    // Auto-detect and initialize sensors via registry
    sensorRegistry.init();
    sensorRegistry.autoDetect();
    sensorRegistry.printStatus();

    // Update shared sensor flags
    ISensor* ensSensor = sensorRegistry.getSensor("ENS160");
    if (ensSensor) {
      sharedEnsValid = ensSensor->isPresent();
    }

    ssr.init();

    Setpoints defaultSp = {DEFAULT_TEMP_MIN, DEFAULT_TEMP_MAX, DEFAULT_HUM_MIN, DEFAULT_HUM_MAX, DEFAULT_CO2_MAX};
    if (hyst.loadSetpointsNVS()) {
      Serial.println("[HYST] Setpoints cargados desde NVS");
    } else {
      hyst.init(defaultSp);
      Serial.println("[HYST] Setpoints por defecto aplicados");
    }

    // Load persisted actuator state and apply HOLD_WINDOW
    actuatorNVSInit();
    actuatorNVSLoadHoldWindow(holdWindow);
    ActuatorPersistedData persisted;
    uint32_t persistTs = 0;
    if (actuatorNVSLoad(&persisted, &persistTs) && persistTs > 0) {
      unsigned long age = millis() - persistTs;
      provisionalMode = false;
      for (int ch = 0; ch < ACTUATOR_CHANNELS; ch++) {
        if (age < holdWindow[ch]) {
          actuatorDesired[ch] = persisted.desired[ch];
          actuatorMode[ch] = persisted.mode[ch];
          provisionalMode = true;
        }
      }
      if (provisionalMode) {
        Serial.printf("[ACTNVS] Estado restaurado (age=%lums): %u%u%u%u / %u%u%u%u\n",
          age,
          persisted.desired[0], persisted.desired[1], persisted.desired[2], persisted.desired[3],
          persisted.mode[0], persisted.mode[1], persisted.mode[2], persisted.mode[3]);
      } else {
        Serial.printf("[ACTNVS] Hold window expirado (age=%lums) — arranque fresco\n", age);
      }
      lastActuatorPersist = persistTs;
    }

    httpPoller.init(deviceManager.getDeviceId().c_str(), BACKEND_HOST, BACKEND_PORT);
    ota.init(deviceManager.getDeviceId().c_str());

    mqtt.init(deviceManager.getDeviceId().c_str());
    mqtt.setOtaCallback(otaMqttCallback);
    mqtt.setActuatorCallback(mqttActuatorCallback);

    bootTime = millis();
    lightCycleStart = bootTime;
    sharedLightOn = true;

    // Determine initial state based on boot test and WiFi
    if (!bootResult.overall) {
      sm.fsmTransition(ST_SAFE, bootResult.failReason);
      Serial.printf("[BOOT] CRITICAL FAIL: %s — entering ST_SAFE\n", bootResult.failReason);
    } else {
      sm.fsmTransition(wifi.isConnected() ? ST_NORMAL : ST_DEGRADED, "setup complete");
    }

    // Capture device info for MQTT and backend
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[18];
    snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
      mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    strncpy(sharedMac, macStr, sizeof(sharedMac) - 1);
    strncpy(sharedFwVer, ota.getVersion(), sizeof(sharedFwVer) - 1);
    strncpy(sharedHwRev, HW_REVISION, sizeof(sharedHwRev) - 1);

    // Self-registration post-provisioning
    for (int i = 0; i < 5; i++) {
      if (httpPoller.registerDevice(sharedFwVer, sharedMac, sharedHwRev)) break;
      vTaskDelay(pdMS_TO_TICKS(2000));
    }

    if (otaConfirmacion.isPendingVerification()) {
      if (otaConfirmacion.selfTest()) {
        otaConfirmacion.confirm();
        String ver = nvsGetFwVer();
        Serial.printf("[OTA] Firmware v%s confirmado post-OTA\n", ver.c_str());
        char successPayload[128];
        snprintf(successPayload, sizeof(successPayload),
          "{\"estado\":\"OTA_SUCCESS\",\"version\":\"%s\"}", ver.c_str());
        mqtt.publish("ota/status", successPayload, true);
      } else {
        Serial.println("[OTA] Self-test falló — rollback pendiente");
      }
    } else {
      esp_ota_mark_app_valid_cancel_rollback();
    }

    xTaskCreatePinnedToCore(taskSensors, "Sensors", STACK_SENSORS, NULL, PRIORITY_SENSORS, &taskSensorsHandle, CORE_CONTROL);
    xTaskCreatePinnedToCore(taskSSR, "SSR", STACK_SSR, NULL, PRIORITY_SSR, &taskSSRHandle, CORE_CONTROL);
    xTaskCreatePinnedToCore(taskWiFi, "WiFi", STACK_WIFI, NULL, PRIORITY_WIFI, &taskWiFiHandle, CORE_NETWORK);
    xTaskCreatePinnedToCore(taskPoller, "Poller", STACK_POLLER, NULL, PRIORITY_MQTT, &taskPollerHandle, CORE_NETWORK);
    xTaskCreatePinnedToCore(taskOTA, "OTA", STACK_OTA, NULL, PRIORITY_OTA, &taskOTAHandle, CORE_NETWORK);
    xTaskCreatePinnedToCore(taskMQTT, "MQTT", STACK_MQTT, NULL, PRIORITY_MQTT, &taskMQTTHandle, CORE_NETWORK);
    xTaskCreatePinnedToCore(taskTelemetry, "Telemetry", STACK_TELEMETRY, NULL, PRIORITY_TELEMETRY, &taskTelemetryHandle, CORE_NETWORK);

    telemetryBuffer.init(&eventBus);

    // Inicializar boton SMFB
    if (BUTTON_PIN >= 0) {
      buttonDriver.init(BUTTON_PIN);
      buttonFsm.init();
      buttonHandler.init(&sm);
      xTaskCreatePinnedToCore(taskButton, "Button", BUTTON_TASK_STACK,
                              NULL, BUTTON_TASK_PRIORITY, &taskButtonHandle, CORE_CONTROL);
    }

    healthMonitor.init(&eventBus, taskSensorsHandle, taskSSRHandle,
                       taskWiFiHandle, taskMQTTHandle, taskOTAHandle,
                       taskTelemetryHandle, taskButtonHandle);
    xTaskCreatePinnedToCore(taskMonitor, "Monitor", 4096, NULL, 1, NULL, CORE_NETWORK);

    Serial.printf("[OTA] Firmware v%s\n", ota.getVersion());
    Serial.printf("[SYS] %d tareas FreeRTOS creadas\n", 9);
    setLEDColor(0, 0, 0);

  } else {
    // === MODO PROVISIONING: sin credenciales ===
    Serial.println("[BOOT] Sin credenciales — modo provisioning BLE");
    sm.fsmTransition(ST_PROVISIONING, "no credentials");
    bleProv.start();

    xTaskCreatePinnedToCore(taskProvisioningIdle, "ProvIdle", 2048, NULL, 1, NULL, CORE_NETWORK);

    Serial.println("[BLE] Modo provisioning — esperando configuración");
  }
}

void loop() {
  vTaskDelete(NULL);
}
