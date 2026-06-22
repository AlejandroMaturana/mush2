#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <EEPROM.h>
#include "wifi_manager.h"
#include "state_machine.h"
#include "mqtt_handler.h"
#include "ota_handler.h"
#include "aht_sensor.h"
#include "ens160_sensor.h"
#include "ssr_controller.h"
#include "hysteresis_controller.h"
#include "thingspeak_client.h"
#include "config.h"

WiFiManager wifi;
StateMachine sm;
MQTTHandler mqtt;
OTAHandler ota;
AHTSensor aht;
EnsSensor ens;
SSRController ssr;
HysteresisController hyst;
ThingSpeakClient ts;

unsigned long lastSensorRead = 0;
unsigned long lastTsSend = 0;
unsigned long lastStatePublish = 0;
unsigned long lastAlarmCheck = 0;
unsigned long bootTime = 0;
bool ensAvailable = false;

String systemState = "NORMAL";
unsigned long lastAlarmSent = 0;
unsigned long lastWifiRetry = 0;
unsigned int wifiRetryDelay = 5000;
unsigned long lastOtaCheck = 0;

unsigned long lightCycleStart = 0;
bool lightPhaseOn = false;

unsigned int sensorFailCount = 0;
unsigned long lastSensorValid = 0;
float fallbackTemp = 0;
float fallbackHum = 0;
bool fallbackActive = false;
unsigned long fallbackStart = 0;

void onOTA(const char* cmdId, const char* action, const char* url) {
  Serial.printf("[OTA] cmdId=%s action=%s url=%s\n", cmdId, action, url ? url : "");
  if (strcmp(action, "activate") == 0) {
    ota.startArduinoOTA();
    mqtt.publishAck(cmdId, "OTA_ACTIVATED", "\"ota\":true");
  } else if (strcmp(action, "update") == 0 && url) {
    if (ota.startHTTPUpdate(url)) {
      mqtt.publishAck(cmdId, "OTA_UPDATE_OK", "\"ota\":true");
    } else {
      mqtt.publishAck(cmdId, "OTA_UPDATE_FAIL", "\"ota\":false");
    }
  }
}

void onCommand(const char* cmdId, int channel, const char* command) {
  Serial.printf("[CMD] cmdId=%s channel=%d command=%s\n", cmdId, channel, command);
  hyst.setMode(CTRL_REMOTE);
  char response[32];
  ssr.processCommand(channel, command, response, sizeof(response));
  char channelInfo[64];
  snprintf(channelInfo, sizeof(channelInfo),
    "\"channel\":%d,\"state\":\"%s\"", channel, strcmp(command, "ON") == 0 ? "ON" : "OFF");
  mqtt.publishAck(cmdId, response, channelInfo);
}

void onConfig(const char* cmdId, JsonDocument& doc) {
  Serial.printf("[CONFIG] cmdId=%s\n", cmdId);
  Setpoints sp = hyst.getSetpoints();
  bool changed = false;
  if (doc["tempMin"]) { sp.tempMin = doc["tempMin"]; changed = true; }
  if (doc["tempMax"]) { sp.tempMax = doc["tempMax"]; changed = true; }
  if (doc["humMin"])  { sp.humMin = doc["humMin"]; changed = true; }
  if (doc["humMax"])  { sp.humMax = doc["humMax"]; changed = true; }
  if (doc["co2Max"])  { sp.co2Max = doc["co2Max"]; changed = true; }
  if (doc["mode"]) {
    const char* modeStr = doc["mode"];
    if (strcmp(modeStr, "LOCAL") == 0) hyst.setMode(CTRL_LOCAL);
    else if (strcmp(modeStr, "REMOTE") == 0) hyst.setMode(CTRL_REMOTE);
    else if (strcmp(modeStr, "OFF") == 0) hyst.setMode(CTRL_OFF);
    changed = true;
  }
  if (changed) {
    hyst.setSetpoints(sp);
    mqtt.publishConfigAck(cmdId, "OK");
    Serial.printf("[CONFIG] Setpoints: T[%.1f-%.1f] H[%.1f-%.1f] CO2[%u] Mode=%d\n",
      sp.tempMin, sp.tempMax, sp.humMin, sp.humMax, sp.co2Max, hyst.getMode());
  } else {
    mqtt.publishConfigAck(cmdId, "NO_CHANGE");
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n[Mush2] Iniciando...");

  sm.init();

  if (sm.isSafeMode()) {
    Serial.println("[SAFE] Modo seguro — 5+ reinicios consecutivos. Esperando 60s...");
    digitalWrite(LED_BUILTIN, LOW);
    delay(60000);
    EEPROM.write(0, 0);
    EEPROM.commit();
    sm.setState(ST_INIT);
  }

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  Wire.begin(D2, D1);
  Wire.setClock(100000);

  sm.setState(ST_WIFI);
  wifi.init();
  if (!wifi.connect()) {
    sm.setError("WIFI_FAIL");
  }

  if (sm.getState() != ST_ERROR) {
    if (!aht.init()) {
      Serial.println("[ERROR] AHT21 no disponible");
    }
    if (ens.init()) {
      ensAvailable = true;
    } else {
      Serial.println("[INFO] ENS160 no presente — operando solo con AHT21");
    }
    ssr.init(SSR_ACTIVE_HIGH);

    Setpoints defaultSp = {DEFAULT_TEMP_MIN, DEFAULT_TEMP_MAX, DEFAULT_HUM_MIN, DEFAULT_HUM_MAX, DEFAULT_CO2_MAX};
    hyst.init(defaultSp);
    Serial.println("[HYST] Controlador de histéresis iniciado");

    if (wifi.isConnected()) {
      mqtt.init(DEVICE_ID);
      mqtt.setCommandCallback(onCommand);
      mqtt.setConfigCallback(onConfig);
      mqtt.setOTACallback(onOTA);
      ota.init(DEVICE_ID);
    }
  }

  bootTime = millis();
  lightCycleStart = bootTime;
  lightPhaseOn = true;
  sm.setState(wifi.isConnected() ? ST_NORMAL : ST_DEGRADED);
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.printf("[OTA] Firmware v%s\n", ota.getVersion());
}

void loop() {
  sm.feedWatchdog();
  sm.handleWatchdog();

  wifi.loop();
  ota.loop();
  bool wifiOk = wifi.isConnected();

  if (wifiOk) {
    mqtt.loop();
  }

  if (!wifiOk && sm.getState() == ST_NORMAL) {
    Serial.println("[WARN] WiFi perdido — DEGRADED");
    sm.setState(ST_DEGRADED);
    if (mqtt.isConnected()) {
      mqtt.publishOnline(false);
    }
    lastWifiRetry = millis();
    wifiRetryDelay = 5000;
  }

  if (!wifiOk && sm.getState() == ST_DEGRADED) {
    unsigned long now = millis();
    if (now - lastWifiRetry >= wifiRetryDelay) {
      lastWifiRetry = now;
      if (wifi.connect()) {
        sm.setState(ST_NORMAL);
        mqtt.init(DEVICE_ID);
        mqtt.setCommandCallback(onCommand);
        mqtt.setConfigCallback(onConfig);
        mqtt.publishOnline(true);
        wifiRetryDelay = 5000;
      } else {
        wifiRetryDelay = min(wifiRetryDelay * 2, 60000u);
      }
    }
  }

  ssr.loop();

  unsigned long now = millis();
  unsigned long uptime = (now - bootTime) / 1000;

  unsigned long lightElapsed = now - lightCycleStart;
  if (lightPhaseOn && lightElapsed >= LIGHT_CYCLE_MS) {
    lightPhaseOn = false;
    lightCycleStart = now;
    hyst.setLightState(false);
    Serial.println("[LIGHT] Fotoperiodo OFF");
  } else if (!lightPhaseOn && lightElapsed >= DARK_CYCLE_MS) {
    lightPhaseOn = true;
    lightCycleStart = now;
    hyst.setLightState(true);
    Serial.println("[LIGHT] Fotoperiodo ON");
  }

  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;

    SensorReading reading = aht.read();
    float temp = reading.temperature;
    float hum = reading.humidity;

    if (!reading.valid) {
      sensorFailCount++;
      Serial.printf("[SENSOR] Lectura inválida #%u\n", sensorFailCount);

      if (sensorFailCount >= 3) {
        Serial.println("[FAILSAFE] 3 fallos consecutivos AHT21 — modo seguro");
        ssr.setAll(0);
        systemState = "SAFE_SENSOR";
        if (mqtt.isConnected()) {
          mqtt.publishAlarm("SENSOR_FAIL_AHT21");
        }
        if (fallbackActive && (now - fallbackStart > 300000)) {
          fallbackActive = false;
        }
        if (!fallbackActive && lastSensorValid > 0) {
          fallbackActive = true;
          fallbackStart = now;
          fallbackTemp = temp;
          fallbackHum = hum;
        }
        sensorFailCount = 3;
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
      }
      lastSensorValid = now;

      if (fallbackActive) {
        fallbackActive = false;
      }
    }

    EnsReading ensReading = {0, 0, 0, false};
    if (reading.valid && ensAvailable) {
      ensReading = ens.read(temp, hum);

      if (!ensReading.valid) {
        if (mqtt.isConnected() && (now - lastAlarmSent > 120000)) {
          mqtt.publishAlarm("ENS160_FAIL");
          lastAlarmSent = now;
        }
      }

      if (ensReading.valid && ensReading.eco2 > 0 && ensReading.eco2 < 400) {
        ensReading.eco2 = 800;
        if (mqtt.isConnected() && (now - lastAlarmSent > 120000)) {
          mqtt.publishAlarm("CO2_ANOMALY");
          lastAlarmSent = now;
        }
      }
    }

    hyst.setOverheat(temp);

    if (reading.valid) {
      Serial.printf("[SENSOR] T: %.1f°C | HR: %.1f%%", temp, hum);
      if (ensReading.valid) {
        Serial.printf(" | eCO₂: %u ppm | TVOC: %u ppb | AQI: %u\n",
          ensReading.eco2, ensReading.tvoc, ensReading.aqi);
      } else {
        Serial.println();
      }

      uint8_t hystOutputs[4] = {0, 0, 0, 0};
      hyst.evaluate(temp, hum, ensReading.eco2, hystOutputs);

      CtrlMode ctrlMode = hyst.getMode();
      if (ctrlMode == CTRL_LOCAL || hyst.getOverheatState() == OH_ACTIVE) {
        ssr.setChannel(1, hystOutputs[1]);  // CH1 — Ventilación
        ssr.setChannel(2, hystOutputs[0]);  // CH2 — Manta Térmica
        ssr.setChannel(3, hystOutputs[2]);  // CH3 — Humidificación
        ssr.setChannel(4, hystOutputs[3]);  // CH4 — Iluminación
      }

      if (hyst.getOverheatState() == OH_ACTIVE) {
        systemState = "OVERHEAT";
        if (mqtt.isConnected() && (now - lastAlarmSent > 30000)) {
          mqtt.publishAlarm(hyst.getAlarmReason());
          lastAlarmSent = now;
        }
      } else if (hyst.getOverheatState() == OH_RECOVERY) {
        systemState = "NORMAL";
        if (mqtt.isConnected()) {
          mqtt.publishAlarm(hyst.getAlarmReason());
        }
      } else {
        systemState = (reading.valid && (!ensAvailable || ensReading.valid))
          ? "NORMAL" : "DEGRADED";
      }

      if (sm.getState() == ST_NORMAL || sm.getState() == ST_DEGRADED) {
        if (systemState == "OVERHEAT" || systemState == "SAFE_SENSOR") {
          if (sm.getState() != ST_ERROR) sm.setState(ST_ERROR);
        } else {
          sm.setState(systemState == "NORMAL" ? ST_NORMAL : ST_DEGRADED);
        }
      }

      if (mqtt.isConnected()) {
        String sensors = "{\"temperature\":" + String(temp, 1)
          + ",\"humidity\":" + String(hum, 1);
        if (ensReading.valid) {
          sensors += ",\"co2\":" + String(ensReading.eco2)
            + ",\"voc\":" + String(ensReading.tvoc);
        }
        sensors += "}";

        String modeStr = (ctrlMode == CTRL_LOCAL) ? "LOCAL"
          : (ctrlMode == CTRL_REMOTE) ? "REMOTE" : "OFF";

        String payload = "{\"protocol\":\"1.0.0\",\"deviceId\":\"" + String(DEVICE_ID)
          + "\",\"ts\":" + String(now / 1000)
          + ",\"sensors\":" + sensors
          + ",\"status\":{\"state\":\"" + sm.getStateName()
          + "\",\"mode\":\"" + modeStr
          + "\",\"uptime\":" + String(uptime)
          + ",\"wifiRssi\":" + String(wifi.getRSSI())
          + ",\"fwVersion\":\"0.7.0\"}}";
        mqtt.publishTelemetry(payload.c_str());
      }
    } else if (!fallbackActive) {
      Serial.println("[SENSOR] Lectura inválida — sin fallback disponible");
      systemState = "DEGRADED";
      if (sm.getState() == ST_NORMAL) sm.setState(ST_DEGRADED);
    }
  }

  if (now - lastAlarmCheck >= 30000) {
    lastAlarmCheck = now;
    if (mqtt.isConnected()) {
      const char* reason = hyst.getAlarmReason();
      if (reason) {
        if (now - lastAlarmSent > 120000) {
          mqtt.publishAlarm(reason);
          lastAlarmSent = now;
          Serial.printf("[ALARM] %s\n", reason);
        }
      }
    }
  }

  if (now - lastTsSend >= TS_INTERVAL) {
    lastTsSend = now;
    if (wifiOk) {
      SensorReading reading = aht.read();
      if (reading.valid) {
        EnsReading ensData = ens.read(reading.temperature, reading.humidity);
        ts.send(reading.temperature, reading.humidity,
          ensData.valid ? ensData.eco2 : 0,
          ensData.valid ? ensData.tvoc : 0);
      }
    }
  }

  if (now - lastStatePublish >= 60000) {
    lastStatePublish = now;
    String modeStr = (hyst.getMode() == CTRL_LOCAL) ? "LOCAL"
      : (hyst.getMode() == CTRL_REMOTE) ? "REMOTE" : "OFF";

    Serial.printf("[STATS] Uptime: %lus | State: %s | WiFi: %s | MQTT: %s | RSSI: %d | Mode: %s | Light: %s\n",
      uptime,
      sm.getStateName(),
      wifiOk ? "OK" : "NO",
      mqtt.isConnected() ? "OK" : "NO",
      wifi.getRSSI(),
      modeStr.c_str(),
      lightPhaseOn ? "ON" : "OFF");

    if (mqtt.isConnected()) {
      uint8_t ssrStates[4];
      ssr.getStateArray(ssrStates);
      String payload = "{\"protocol\":\"1.0.0\",\"deviceId\":\"" + String(DEVICE_ID)
        + "\",\"ts\":" + String(now / 1000)
        + ",\"actuators\":["
        + "{\"channel\":1,\"state\":\"" + String(ssrStates[0] ? "ON" : "OFF") + "\"},"
        + "{\"channel\":2,\"state\":\"" + String(ssrStates[1] ? "ON" : "OFF") + "\"},"
        + "{\"channel\":3,\"state\":\"" + String(ssrStates[2] ? "ON" : "OFF") + "\"},"
        + "{\"channel\":4,\"state\":\"" + String(ssrStates[3] ? "ON" : "OFF") + "\"}"
        + "],\"mode\":\"" + modeStr + "\"}";
      mqtt.publishState(payload.c_str());
    }
  }
}
