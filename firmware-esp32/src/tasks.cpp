#include "tasks.h"

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
//  NTP timestamp helper
// ============================================================

time_t getTimestamp() {
  if (ntpSynced) {
    return time(NULL);
  }
  return (time_t)((millis()) / 1000);
}

// ============================================================
//  OTA / MQTT callbacks
// ============================================================

void otaMqttCallback(const char* url, const char* version, const char* hash) {
  strncpy(otaCommandUrl, url, sizeof(otaCommandUrl) - 1);
  strncpy(otaCommandVersion, version, sizeof(otaCommandVersion) - 1);
  if (hash) {
    strncpy(otaCommandHash, hash, sizeof(otaCommandHash) - 1);
  } else {
    otaCommandHash[0] = '\0';
  }
  otaCommandPending = true;
  Serial.printf("[OTA] Comando recibido via MQTT: %s (v%s)\n", otaCommandUrl, otaCommandVersion);
}

void mqttActuatorCallback(const MqttActuatorMessage* msg) {
  for (int i = 0; i < msg->cmdCount; i++) {
    int ch = msg->cmds[i].channel;
    if (ch < 1 || ch > 4) continue;
    actuatorDesired[ch - 1] = msg->cmds[i].state;
    actuatorMode[ch - 1] = msg->cmds[i].mode;
    Serial.printf("[MQTT] Actuator ch%d: %s (REMOTE)\n",
      ch, msg->cmds[i].state ? "ON" : "OFF");
  }

  if (msg->hasSetpoints) {
    Setpoints sp = { msg->tempMin, msg->tempMax, msg->humMin, msg->humMax, msg->co2Max };
    hyst.setSetpoints(sp);
    Serial.printf("[MQTT] Setpoints actualizados: T[%.1f-%.1f] H[%.1f-%.1f] CO2<=%u\n",
      sp.tempMin, sp.tempMax, sp.humMin, sp.humMax, sp.co2Max);
  }

  if (strcmp(msg->status, "no_active_cycle") == 0) {
    for (int ch = 0; ch < 4; ch++) {
      actuatorMode[ch] = 0;
    }
    Serial.println("[MQTT] No hay ciclo activo — modo LOCAL");
  }

  provisionalMode = false;

  ActuatorPersistedData data;
  memcpy(data.desired, (const uint8_t*)actuatorDesired, 4);
  memcpy(data.mode, (const uint8_t*)actuatorMode, 4);
  actuatorNVSSave(&data);
  lastActuatorPersist = millis();
}

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
        sensorFailed = true;
        sm.setError("SENSOR_FAIL_AHT21");
        Serial.println("[ALARM] SENSOR_FAIL_AHT21");
        if (fallbackActive && (millis() - fallbackStart > 300000)) {
          fallbackActive = false;
          lastSensorValid = 0;
          Serial.println("[SENSOR] Fallback expirado — sin datos válidos");
        }
        if (!fallbackActive && lastSensorValid > 0 &&
            (millis() - lastSensorValid < 600000)) {
          fallbackActive = true;
          fallbackStart = millis();
          fallbackTemp = lastValidTemp;
          fallbackHum = lastValidHum;
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
        if (sensorFailed) {
          sensorFailed = false;
          sm.fsmTransition(ST_NORMAL, "sensor recovered");
        }
      }
      lastSensorValid = millis();
      lastValidTemp = temp;
      lastValidHum = hum;
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
      sm.fsmTransition(ST_DEGRADED, "sensor fail no fallback");
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
    sm.feedWatchdog();
    sm.handleWatchdog();

    float temp = sharedTemp;
    float hum = sharedHum;
    uint16_t eco2 = sharedEco2;

    hyst.setOverheat(temp);
    sharedOverheatActive = (hyst.getOverheatState() == OH_ACTIVE);

    if (sharedSensorsValid) {
      uint8_t hystOutputs[4] = {0, 0, 0, 0};
      hyst.evaluate(temp, hum, eco2, hystOutputs);

      uint8_t finalState[4] = {
        hystOutputs[1],  // CH1 = Ventilación
        hystOutputs[0],  // CH2 = Calefacción
        hystOutputs[2],  // CH3 = Humidificación
        hystOutputs[3],  // CH4 = Iluminación
      };

      for (int ch = 0; ch < 4; ch++) {
        if (actuatorMode[ch] == 1) {
          finalState[ch] = actuatorDesired[ch];
        }
      }

      if (hyst.getOverheatState() == OH_ACTIVE) {
        finalState[0] = 1;
        finalState[1] = 0;
      }

      if (sensorFailed) {
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
          if (mqtt.isConnected()) {
            mqtt.publishAlarm(hyst.getAlarmReason());
          }
          lastAlarmSent = now;
        }
      } else if (hyst.getOverheatState() == OH_RECOVERY) {
        Serial.printf("[ALARM] %s\n", hyst.getAlarmReason());
        if (mqtt.isConnected()) {
          mqtt.publishAlarm(hyst.getAlarmReason());
        }
      }
    }

    DeviceState current = sm.getState();
    bool faultActive = sharedOverheatActive || sensorFailed;

    if ((current == ST_NORMAL || current == ST_DEGRADED) && faultActive) {
      sm.fsmTransition(ST_ERROR, "fault detected");
    } else if (current == ST_ERROR && !faultActive) {
      sm.fsmTransition(ST_RECOVERY, "fault cleared");
    } else if (current == ST_RECOVERY && !faultActive) {
      sm.fsmTransition(ST_NORMAL, "recovery complete");
    }

    static unsigned long lastAlarmCheck = 0;
    unsigned long nowAlarm = millis();
    if (nowAlarm - lastAlarmCheck >= 30000) {
      lastAlarmCheck = nowAlarm;
      const char* reason = hyst.getAlarmReason();
      if (reason) Serial.printf("[ALARM] %s\n", reason);
    }

    if (sharedOverheatActive || sensorFailed) {
      setLEDColor(255, 0, 0);
    } else if (!sharedSensorsValid) {
      setLEDColor(255, 255, 0);
    } else {
      setLEDColor(0, 255, 0);
    }

    ssr.loop();

    eventBus.loop();
    firmwareLogger.loop();

    esp_task_wdt_reset();
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_SSR));
  }
}

// ============================================================
//  BLE Provisioning Idle Task
// ============================================================

void taskProvisioningIdle(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[PROV] WDT add: %s\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR");
  TickType_t lastWake = xTaskGetTickCount();
  bool ledOn = true;
  unsigned long lastLedToggle = 0;

  while (true) {
    esp_task_wdt_reset();
    bleProv.loop();

    unsigned long now = millis();
    if (now - lastLedToggle >= 750) {
      lastLedToggle = now;
      ledOn = !ledOn;
      setLEDColor(0, 0, ledOn ? 255 : 0);
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(100));
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
        esp_task_wdt_reset();
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
      if (!mqtt.isConnected()) {
        httpPoller.loop();

        if (httpPoller.isConnected()) {
          for (int ch = 1; ch <= 4; ch++) {
            uint8_t state, mode;
            httpPoller.getDesired(ch, &state, &mode);
            actuatorDesired[ch - 1] = state;
            actuatorMode[ch - 1] = mode;
          }

          if (httpPoller.hasSetpoints() && httpPoller.setpointsChanged()) {
            float tMin, tMax, hMin, hMax;
            uint16_t cMax;
            httpPoller.getSetpoints(&tMin, &tMax, &hMin, &hMax, &cMax);
            Setpoints sp = { tMin, tMax, hMin, hMax, cMax };
            hyst.setSetpoints(sp);
            Serial.printf("[POLL] Setpoints: T[%.1f-%.1f] H[%.1f-%.1f] CO2<=%u\n",
              tMin, tMax, hMin, hMax, cMax);
          }

          if (!httpPoller.hasActiveCycle()) {
            for (int ch = 0; ch < 4; ch++) {
              actuatorMode[ch] = 0;
            }
          }

          if (httpPoller.ssrActiveLowChanged()) {
            ssr.setActiveLow(httpPoller.getSsrActiveLow());
          }

          provisionalMode = false;
          ActuatorPersistedData data;
          memcpy(data.desired, (const uint8_t*)actuatorDesired, 4);
          memcpy(data.mode, (const uint8_t*)actuatorMode, 4);
          actuatorNVSSave(&data);
          lastActuatorPersist = millis();
        }
      }
    }

    if (provisionalMode && lastActuatorPersist > 0) {
      unsigned long age = millis() - lastActuatorPersist;
      bool expired = true;
      for (int ch = 0; ch < 4; ch++) {
        if (age < holdWindow[ch]) {
          expired = false;
          break;
        }
      }
      if (expired) {
        Serial.println("[ACTNVS] Hold window expirado — safe defaults");
        for (int ch = 0; ch < 4; ch++) {
          actuatorDesired[ch] = 0;
          actuatorMode[ch] = 0;
        }
        provisionalMode = false;
      }
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_POLLER));
  }
}

// ============================================================
//  MQTT Task
// ============================================================

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

    if (otaCommandPending) {
      otaCommandPending = false;

      if (sm.getState() != ST_NORMAL) {
        Serial.printf("[OTA] Rechazado: estado %s\n", sm.getStateName());
        mqtt.publish("ota/rejected", "{\"causa\":\"estado_no_normal\"}");
        goto ota_skip;
      }

      {
        OtaCandidate cand = otaselector.select(
          String(otaCommandUrl),
          String(otaCommandVersion),
          wifi.getRSSI()
        );

        if (!cand.valid) {
          Serial.println("[OTA] Rechazado por el decisor");
          mqtt.publish("ota/rejected", "{\"causa\":\"decisor_rechaza\"}");
          goto ota_skip;
        }

        String currentVer = nvsGetFwVer();
        int cmp = otaselector.compareSemVer(currentVer, cand.version);
        if (cmp <= 0) {
          Serial.printf("[OTA] Rechazado: version %s <= actual %s\n",
            cand.version.c_str(), currentVer.c_str());
          mqtt.publish("ota/rejected", "{\"causa\":\"version_no_mayor\"}");
          goto ota_skip;
        }

        Serial.println("[OTA] Autorizado — iniciando shutdown...");

        char statusPayload[128];
        snprintf(statusPayload, sizeof(statusPayload),
          "{\"estado\":\"OTA_STARTING\",\"version\":\"%s\"}", cand.version.c_str());
        mqtt.publish("ota/status", statusPayload);

        otaShutdown.begin();
        sm.fsmTransition(ST_OTA_UPDATING, "ota starting");

        bool ok = otaExecutor.begin(cand.url, cand.hash);
        if (ok) {
          Serial.printf("[OTA] Ejecutor reporta exito v%s — reiniciando...\n", cand.version.c_str());
          nvsSetFwVer(cand.version);
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
    }

ota_skip:
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_OTA));
  }
}

void taskTelemetry(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[TELEMETRY] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);
  TickType_t lastWake = xTaskGetTickCount();
  unsigned long lastTsSend = 0;
  unsigned long lastMqttTel = 0;
  unsigned long lastMqttStatus = 0;
  unsigned long lastReplay = 0;

  while (true) {
    esp_task_wdt_reset();

    unsigned long now = millis();
    bool wifiOk = wifi.isConnected();
    bool mqttOk = mqtt.isConnected();

    if (wifiOk && mqttOk && now - lastReplay >= 5000) {
      lastReplay = now;
      int replayed = 0;
      while (telemetryBuffer.hasPending() && replayed < 5) {
        TelemetryEntry entry;
        if (telemetryBuffer.pop(&entry)) {
          mqtt.publishTelemetry(entry.temperature, entry.humidity,
            entry.eco2, entry.tvoc, entry.aqi);
          replayed++;
          vTaskDelay(pdMS_TO_TICKS(100));
        }
      }
      if (replayed > 0) {
        Serial.printf("[TELEMETRY] Replay: %d entradas enviadas\n", replayed);
      }
    }

    if (now - lastTsSend >= TS_INTERVAL) {
      lastTsSend = now;
      if (wifiOk && sharedSensorsValid) {
        ts.send(sharedTemp, sharedHum,
          sharedEnsValid ? sharedEco2 : 0,
          sharedEnsValid ? sharedTvoc : 0);
      }
    }

    if (now - lastMqttTel >= 10000) {
      lastMqttTel = now;
      if (wifiOk && mqttOk && sharedSensorsValid) {
        mqtt.publishTelemetry(sharedTemp, sharedHum,
          sharedEnsValid ? sharedEco2 : 0,
          sharedEnsValid ? sharedTvoc : 0,
          sharedAqi);
      } else if (sharedSensorsValid && !wifiOk) {
        telemetryBuffer.push(sharedTemp, sharedHum,
          sharedEnsValid ? sharedEco2 : 0,
          sharedEnsValid ? sharedTvoc : 0,
          sharedAqi);
      }
    }

    if (now - lastMqttStatus >= 60000) {
      lastMqttStatus = now;
      if (wifiOk && mqtt.isConnected()) {
        CtrlMode ctrlMode = hyst.getMode();
        const char* modeStr = (ctrlMode == CTRL_LOCAL) ? "LOCAL"
          : (ctrlMode == CTRL_REMOTE) ? "REMOTE" : "OFF";
        mqtt.publishStatus(sm.getStateName(), modeStr, wifi.getRSSI(), sharedMac, sharedFwVer, sharedHwRev);
      }
    }

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

      Serial.printf("[STATS] Uptime: %lus | State: %s | WiFi: %s | MQTT: %s | RSSI: %d | Mode: %s | Light: %s | SSR: %s\n",
        sharedUptime,
        sm.getStateName(),
        wifi.isConnected() ? "OK" : "NO",
        mqtt.isConnected() ? "OK" : "NO",
        wifi.getRSSI(),
        modeStr.c_str(),
        sharedLightOn ? "ON" : "OFF",
        ssrStr);
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(DELAY_TELEMETRY));
  }
}
