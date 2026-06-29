#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_NeoPixel.h>
#include <esp_task_wdt.h>
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

// Global instances
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
Adafruit_NeoPixel led(LED_RGB_COUNT, LED_RGB_PIN, NEO_GRB + NEO_KHZ800);

// Shared state (accessed across cores, declared volatile)
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
volatile bool fallbackActive = false;
volatile unsigned long sensorFailCount = 0;
char systemState[16] = "NORMAL";

// Actuator desired states (written by Core 0, read by Core 1)
volatile uint8_t actuatorDesired[4] = {0, 0, 0, 0};
volatile uint8_t actuatorMode[4] = {0, 0, 0, 0};  // 0=LOCAL, 1=REMOTE

// Task handles
TaskHandle_t taskSensorsHandle = NULL;
TaskHandle_t taskSSRHandle = NULL;
TaskHandle_t taskWiFiHandle = NULL;
TaskHandle_t taskPollerHandle = NULL;
TaskHandle_t taskOTAHandle = NULL;
TaskHandle_t taskTelemetryHandle = NULL;
TaskHandle_t taskMQTTHandle = NULL;

// Forward declarations
void setLEDColor(uint8_t r, uint8_t g, uint8_t b);
void processPhotoperiod();

// ============================================================
//  FreeRTOS Tasks — Core 1 (Control)
// ============================================================

void taskSensors(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[SENSORS] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();
  unsigned long lastSensorValid = 0;
  unsigned long fallbackStart = 0;

  while (true) {
    esp_task_wdt_reset();

    SensorReading reading = aht.read();
    float temp = reading.temperature;
    float hum = reading.humidity;

    if (!reading.valid) {
      sensorFailCount++;
      Serial.printf("[SENSOR] Lectura inválida #%u\n", (unsigned int)sensorFailCount);

      if (sensorFailCount >= 3) {
        ssr.setAll(0);
        strcpy(systemState, "SAFE_SENSOR");
        Serial.println("[ALARM] SENSOR_FAIL_AHT21");
        if (fallbackActive && (millis() - fallbackStart > 300000)) {
          fallbackActive = false;
        }
        if (!fallbackActive && lastSensorValid > 0) {
          fallbackActive = true;
          fallbackStart = millis();
          fallbackTemp = temp;
          fallbackHum = hum;
        }
      }

      if (fallbackActive) {
        temp = fallbackTemp;
        hum = fallbackHum;
        reading.valid = true;
      }
    } else {
      if (sensorFailCount > 0) {
        sensorFailCount = 0;
        Serial.println("[SENSOR] Sensor recuperado");
        if (strcmp(systemState, "SAFE_SENSOR") == 0) strcpy(systemState, "NORMAL");
      }
      lastSensorValid = millis();
      fallbackActive = false;
    }

    if (reading.valid) {
      sharedTemp = temp;
      sharedHum = hum;

      EnsReading ensReading = {0, 0, 0, false};
      if (ens.isPresent()) {
        ensReading = ens.read(temp, hum);

        if (!ensReading.valid) {
          Serial.println("[ALARM] ENS160_FAIL");
        }

        if (ensReading.valid && ensReading.eco2 > 0 && ensReading.eco2 < 400) {
          ensReading.eco2 = 800;
          Serial.println("[ALARM] CO2_ANOMALY");
        }

        if (ensReading.valid) {
          sharedEnsValid = true;
          sharedEco2 = ensReading.eco2;
          sharedTvoc = ensReading.tvoc;
          sharedAqi = ensReading.aqi;
        } else {
          sharedEnsValid = false;
        }
      }

      sharedSensorsValid = true;
      sharedUptime = (millis() - bootTime) / 1000;

      Serial.printf("[SENSOR] T: %.1f°C | HR: %.1f%%", temp, hum);
      if (sharedEnsValid) {
        Serial.printf(" | eCO₂: %u ppm | TVOC: %u ppb | AQI: %u\n",
          sharedEco2, sharedTvoc, sharedAqi);
      } else {
        Serial.println();
      }
    } else if (!fallbackActive) {
      sharedSensorsValid = false;
      strcpy(systemState, "DEGRADED");
      Serial.println("[SENSOR] Lectura inválida — sin fallback disponible");
    }

    processPhotoperiod();

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_SENSORS));
  }
}

void taskSSR(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) {
    Serial.printf("[SSR] WDT add: %s (0x%x)\n",
      wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  }
  TickType_t lastWake = xTaskGetTickCount();
  unsigned long lastAlarmSent = 0;

  while (true) {
    // Software watchdog: feed and check
    sm.feedWatchdog();
    sm.handleWatchdog();

    // Evaluate hysteresis with current sensor data
    float temp = sharedTemp;
    float hum = sharedHum;
    uint16_t eco2 = sharedEco2;

    hyst.setOverheat(temp);
    sharedOverheatActive = (hyst.getOverheatState() == OH_ACTIVE);

    if (sharedSensorsValid) {
      uint8_t hystOutputs[4] = {0, 0, 0, 0};
      hyst.evaluate(temp, hum, eco2, hystOutputs);

      // Build final state: start with hysteresis, then apply REMOTE overrides
      uint8_t finalState[4] = {
        hystOutputs[1],  // CH1 = Ventilación
        hystOutputs[0],  // CH2 = Calefacción
        hystOutputs[2],  // CH3 = Humidificación
        hystOutputs[3],  // CH4 = Iluminación
      };

      for (int ch = 0; ch < 4; ch++) {
        if (actuatorMode[ch] == 1) {  // REMOTE override
          finalState[ch] = actuatorDesired[ch];
        }
      }

      // Overheat override (always wins)
      if (hyst.getOverheatState() == OH_ACTIVE) {
        finalState[0] = 1;  // ventilation ON
        finalState[1] = 0;  // heat OFF
      }

      // SAFE_SENSOR override (always wins)
      if (strcmp(systemState, "SAFE_SENSOR") == 0) {
        finalState[0] = 0;
        finalState[1] = 0;
        finalState[2] = 0;
        finalState[3] = 0;
      }

      ssr.setChannel(1, finalState[0]);
      ssr.setChannel(2, finalState[1]);
      ssr.setChannel(3, finalState[2]);
      ssr.setChannel(4, finalState[3]);

      if (hyst.getOverheatState() == OH_ACTIVE) {
        unsigned long now = millis();
        if (now - lastAlarmSent > 30000) {
          Serial.printf("[ALARM] %s\n", hyst.getAlarmReason());
          lastAlarmSent = now;
        }
      } else if (hyst.getOverheatState() == OH_RECOVERY) {
        Serial.printf("[ALARM] %s\n", hyst.getAlarmReason());
      }
    }

    // State machine transitions based on system state
    DeviceState current = sm.getState();
    bool faultActive = sharedOverheatActive || strcmp(systemState, "SAFE_SENSOR") == 0;

    if ((current == ST_NORMAL || current == ST_DEGRADED) && faultActive) {
      sm.fsmTransition(ST_ERROR, "fault detected");
    } else if (current == ST_ERROR && !faultActive) {
      sm.fsmTransition(ST_RECOVERY, "fault cleared");
    } else if (current == ST_RECOVERY && !faultActive) {
      sm.fsmTransition(ST_NORMAL, "recovery complete");
    }

    // Periodic alarm check
    static unsigned long lastAlarmCheck = 0;
    unsigned long nowAlarm = millis();
    if (nowAlarm - lastAlarmCheck >= 30000) {
      lastAlarmCheck = nowAlarm;
      const char* reason = hyst.getAlarmReason();
      if (reason) Serial.printf("[ALARM] %s\n", reason);
    }

    // Update LED status
    if (sharedOverheatActive || strcmp(systemState, "SAFE_SENSOR") == 0) {
      setLEDColor(255, 0, 0);
    } else if (!sharedSensorsValid) {
      setLEDColor(255, 255, 0);
    } else if (httpPoller.isConnected()) {
      setLEDColor(0, 255, 255);
    } else {
      setLEDColor(0, 255, 0);
    }

    ssr.loop();

    esp_task_wdt_reset();
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_SSR));
  }
}

// ============================================================
//  FreeRTOS Tasks — Core 0 (Network)
// ============================================================

void taskWiFi(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[WiFi] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();
  unsigned long lastWifiRetry = 0;
  unsigned int wifiRetryDelay = 5000;

  while (true) {
    esp_task_wdt_reset();

    wifi.loop();
    bool wifiOk = wifi.isConnected();

    if (!wifiOk && sm.getState() == ST_NORMAL) {
      Serial.println("[WARN] WiFi perdido — DEGRADED");
      sm.fsmTransition(ST_DEGRADED, "wifi lost");
      lastWifiRetry = millis();
      wifiRetryDelay = 5000;
    }

    if (wifiOk && sm.getState() == ST_DEGRADED) {
      sm.fsmTransition(ST_NORMAL, "wifi recovered");
      wifiRetryDelay = 5000;
    }

    if (!wifiOk && sm.getState() == ST_DEGRADED) {
      unsigned long now = millis();
      if (now - lastWifiRetry >= wifiRetryDelay) {
        lastWifiRetry = now;
        wifi.connect();
        wifiRetryDelay = min(wifiRetryDelay * 2, 60000u);
      }
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_WIFI));
  }
}

void taskPoller(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[POLLER] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();

  while (true) {
    esp_task_wdt_reset();

    if (wifi.isConnected()) {
      httpPoller.loop();
      for (int ch = 1; ch <= 4; ch++) {
        uint8_t state, mode;
        httpPoller.getDesired(ch, &state, &mode);
        actuatorDesired[ch - 1] = state;
        actuatorMode[ch - 1] = mode;
      }
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_POLLER));
  }
}

// Shared OTA command state (set by serial or MQTT)
volatile bool otaCommandPending = false;
char otaCommandUrl[256] = "";
char otaCommandVersion[32] = "";

// ============================================================
//  MQTT Task
// ============================================================

void otaMqttCallback(const char* url, const char* version) {
  strncpy(otaCommandUrl, url, sizeof(otaCommandUrl) - 1);
  strncpy(otaCommandVersion, version, sizeof(otaCommandVersion) - 1);
  otaCommandPending = true;
  Serial.printf("[OTA] Comando recibido via MQTT: %s (v%s)\n", otaCommandUrl, otaCommandVersion);
}

void taskMQTT(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[MQTT] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();

  while (true) {
    esp_task_wdt_reset();

    if (wifi.isConnected()) {
      mqtt.loop();
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_MQTT));
  }
}

void taskOTA(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[OTA] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();
  unsigned long lastSerialCheck = 0;

  while (true) {
    esp_task_wdt_reset();

    if (wifi.isConnected()) {
      ota.loop();
    }

    // Check for serial OTA commands (development/debug)
    if (millis() - lastSerialCheck > 1000) {
      lastSerialCheck = millis();
      if (Serial.available() > 0) {
        String line = Serial.readStringUntil('\n');
        line.trim();
        if (line.startsWith("ota ")) {
          String url = line.substring(4);
          if (url.length() > 0 && url.startsWith("https://")) {
            strncpy(otaCommandUrl, url.c_str(), sizeof(otaCommandUrl) - 1);
            snprintf(otaCommandVersion, sizeof(otaCommandVersion), "0.0.0");
            otaCommandPending = true;
            Serial.printf("[OTA] Comando recibido via serial: %s\n", otaCommandUrl);
          }
        }
      }
    }

    // Process pending OTA command
    if (otaCommandPending) {
      otaCommandPending = false;

      if (sm.getState() != ST_NORMAL) {
        Serial.printf("[OTA] Rechazado: estado %s\n", sm.getStateName());
        mqtt.publish("ota/rejected", "{\"causa\":\"estado_no_normal\"}");
        continue;
      }

      OtaCandidate cand = otaselector.select(
        String(otaCommandUrl),
        String(otaCommandVersion),
        wifi.getRSSI()
      );

      if (!cand.valid) {
        Serial.println("[OTA] Rechazado por el decisor");
        mqtt.publish("ota/rejected", "{\"causa\":\"decisor_rechaza\"}");
        continue;
      }

      String currentVer = nvsGetFwVer();
      int cmp = otaselector.compareSemVer(currentVer, cand.version);
      if (cmp <= 0) {
        Serial.printf("[OTA] Rechazado: version %s <= actual %s\n",
          cand.version.c_str(), currentVer.c_str());
        mqtt.publish("ota/rejected", "{\"causa\":\"version_no_mayor\"}");
        continue;
      }

      Serial.println("[OTA] Autorizado — iniciando shutdown...");

      char statusPayload[128];
      snprintf(statusPayload, sizeof(statusPayload),
        "{\"estado\":\"OTA_STARTING\",\"version\":\"%s\"}", cand.version.c_str());
      mqtt.publish("ota/status", statusPayload);

      otaShutdown.begin();
      sm.fsmTransition(ST_OTA_UPDATING, "ota starting");

      bool ok = otaExecutor.begin(cand.url);
      if (ok) {
        Serial.println("[OTA] Ejecutor reporta exito — reiniciando...");
        delay(1000);
        ESP.restart();
      } else {
        Serial.println("[OTA] Fallo en ejecutor — restaurando");
        snprintf(statusPayload, sizeof(statusPayload),
          "{\"estado\":\"OTA_FAILED\",\"error\":\"download_failed\"}");
        mqtt.publish("ota/status", statusPayload, true);
        sm.fsmTransition(ST_NORMAL, "ota failed");
      }
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_OTA));
  }
}

void taskTelemetry(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[TELEMETRY] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();
  unsigned long lastTsSend = 0;

  while (true) {
    esp_task_wdt_reset();

    unsigned long now = millis();
    bool wifiOk = wifi.isConnected();

    // ThingSpeak upload
    if (now - lastTsSend >= TS_INTERVAL) {
      lastTsSend = now;
      if (wifiOk && sharedSensorsValid) {
        ts.send(sharedTemp, sharedHum,
          sharedEnsValid ? sharedEco2 : 0,
          sharedEnsValid ? sharedTvoc : 0);
      }
    }

    // State stats every 60s
    static unsigned long lastStatePublish = 0;
    if (now - lastStatePublish >= 60000) {
      lastStatePublish = now;

      CtrlMode ctrlMode = hyst.getMode();
      String modeStr = (ctrlMode == CTRL_LOCAL) ? "LOCAL"
        : (ctrlMode == CTRL_REMOTE) ? "REMOTE" : "OFF";

      uint8_t ssrStates[4];
      ssr.getStateArray(ssrStates);

      char ssrStr[8];
      snprintf(ssrStr, sizeof(ssrStr), "%u%u%u%u",
        ssrStates[0] & 1, ssrStates[1] & 1,
        ssrStates[2] & 1, ssrStates[3] & 1);

      Serial.printf("[STATS] Uptime: %lus | State: %s | WiFi: %s | HTTP: %s | RSSI: %d | Mode: %s | Light: %s | SSR: %s\n",
        sharedUptime,
        sm.getStateName(),
        wifi.isConnected() ? "OK" : "NO",
        httpPoller.isConnected() ? "OK" : "NO",
        wifi.getRSSI(),
        modeStr.c_str(),
        sharedLightOn ? "ON" : "OFF",
        ssrStr);
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_TELEMETRY));
  }
}

// ============================================================
//  LED RGB Helper
// ============================================================

void setLEDColor(uint8_t r, uint8_t g, uint8_t b) {
  led.setPixelColor(0, led.Color(r, g, b));
  led.show();
}

// ============================================================
//  Photoperiod
// ============================================================

void processPhotoperiod() {
  unsigned long now = millis();
  unsigned long lightElapsed = now - lightCycleStart;

  if (sharedLightOn && lightElapsed >= LIGHT_CYCLE_MS) {
    sharedLightOn = false;
    lightCycleStart = now;
    hyst.setLightState(false);
    Serial.println("[LIGHT] Fotoperiodo OFF");
  } else if (!sharedLightOn && lightElapsed >= DARK_CYCLE_MS) {
    sharedLightOn = true;
    lightCycleStart = now;
    hyst.setLightState(true);
    Serial.println("[LIGHT] Fotoperiodo ON");
  }
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

  if (sm.isSafeMode()) {
    Serial.println("[SAFE] Modo seguro — 5+ reinicios consecutivos. Esperando 60s...");
    setLEDColor(255, 0, 0);
    for (int i = 0; i < 120; i++) {
      esp_task_wdt_reset();
      vTaskDelay(pdMS_TO_TICKS(500));
    }
    sm.fsmTransition(ST_INIT, "safe mode recovery");
  }

  // I2C bus
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(I2C_FREQ);

  sm.fsmTransition(ST_WIFI, "setup");
  wifi.init();
  wifi.connect(); // async — no bloquea

  deviceManager.init();

  if (sm.getState() != ST_ERROR) {
    if (!aht.init()) {
      Serial.println("[ERROR] AHT21 no disponible");
    }
    if (ens.init()) {
      sharedEnsValid = true;
    } else {
      Serial.println("[INFO] ENS160 no presente — operando solo con AHT21");
    }

    ssr.init();

    Setpoints defaultSp = {DEFAULT_TEMP_MIN, DEFAULT_TEMP_MAX, DEFAULT_HUM_MIN, DEFAULT_HUM_MAX, DEFAULT_CO2_MAX};
    hyst.init(defaultSp);
    Serial.println("[HYST] Controlador de histéresis iniciado");

    httpPoller.init(deviceManager.getDeviceId().c_str(), BACKEND_HOST, BACKEND_PORT);
    ota.init(deviceManager.getDeviceId().c_str());
  }

  // Inicializar componentes OTA v3
  otaselector = OTASelector();
  otaShutdown = OTAShutdown();
  otaExecutor = OTAExecutor();
  otaConfirmacion = OTAConfirmation();
  nvsInit();

  // MQTT
  mqtt.init(deviceManager.getDeviceId().c_str());
  mqtt.setOtaCallback(otaMqttCallback);

  bootTime = millis();
  lightCycleStart = bootTime;
  sharedLightOn = true;

  sm.fsmTransition(wifi.isConnected() ? ST_NORMAL : ST_DEGRADED, "setup complete");

  // Post-boot OTA: confirm firmware if pending verification
  if (otaConfirmacion.selfTest()) {
    otaConfirmacion.confirm();
    String ver = nvsGetFwVer();
    Serial.printf("[OTA] Firmware v%s confirmado post-OTA\n", ver.c_str());
    char successPayload[128];
    snprintf(successPayload, sizeof(successPayload),
      "{\"estado\":\"OTA_SUCCESS\",\"version\":\"%s\"}", ver.c_str());
    mqtt.publish("ota/status", successPayload, true);
  }

  // Create FreeRTOS tasks
  xTaskCreatePinnedToCore(
    taskSensors, "Sensors", STACK_SENSORS, NULL, PRIORITY_SENSORS,
    &taskSensorsHandle, CORE_CONTROL);

  xTaskCreatePinnedToCore(
    taskSSR, "SSR", STACK_SSR, NULL, PRIORITY_SSR,
    &taskSSRHandle, CORE_CONTROL);

  xTaskCreatePinnedToCore(
    taskWiFi, "WiFi", STACK_WIFI, NULL, PRIORITY_WIFI,
    &taskWiFiHandle, CORE_NETWORK);

  xTaskCreatePinnedToCore(
    taskPoller, "Poller", STACK_POLLER, NULL, PRIORITY_MQTT,
    &taskPollerHandle, CORE_NETWORK);

  xTaskCreatePinnedToCore(
    taskOTA, "OTA", STACK_OTA, NULL, PRIORITY_OTA,
    &taskOTAHandle, CORE_NETWORK);

  xTaskCreatePinnedToCore(
    taskMQTT, "MQTT", STACK_MQTT, NULL, PRIORITY_MQTT,
    &taskMQTTHandle, CORE_NETWORK);

  xTaskCreatePinnedToCore(
    taskTelemetry, "Telemetry", STACK_TELEMETRY, NULL, PRIORITY_TELEMETRY,
    &taskTelemetryHandle, CORE_NETWORK);

  Serial.printf("[OTA] Firmware v%s\n", ota.getVersion());
  Serial.printf("[SYS] %d tareas FreeRTOS creadas en Core %d (control) y Core %d (red)\n",
    6, CORE_CONTROL, CORE_NETWORK);

  setLEDColor(0, 0, 0);
}

void loop() {
  vTaskDelete(NULL);
}
