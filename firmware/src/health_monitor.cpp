#include "health_monitor.h"
#include "logger.h"
#include "config.h"
#include "mqtt_client.h"
#include "state_machine.h"
#include <Wire.h>
#include <esp_task_wdt.h>

extern MQTTClient mqtt;
extern StateMachine sm;

HealthMonitor healthMonitor;

HealthMonitor::HealthMonitor()
  : _bus(nullptr), _taskSensors(nullptr), _taskSSR(nullptr),
    _taskWiFi(nullptr), _taskMQTT(nullptr), _taskOTA(nullptr),
    _taskTelemetry(nullptr), _taskButton(nullptr), _healthy(true) {
  memset(&_metrics, 0, sizeof(_metrics));
  for (int i = 0; i < HB_TASK_COUNT; i++) {
    _lastHeartbeat[i] = 0;
  }
}

void HealthMonitor::init(EventBus* bus, TaskHandle_t sensors, TaskHandle_t ssr,
                         TaskHandle_t wifi, TaskHandle_t mqtt, TaskHandle_t ota,
                         TaskHandle_t telemetry, TaskHandle_t button) {
  _bus = bus;
  _taskSensors = sensors;
  _taskSSR = ssr;
  _taskWiFi = wifi;
  _taskMQTT = mqtt;
  _taskOTA = ota;
  _taskTelemetry = telemetry;
  _taskButton = button;
  LOG_I("HEALTH", "HealthMonitor inicializado (8 tasks tracked)");
}

uint16_t HealthMonitor::_getStackHighWater(TaskHandle_t task) {
  if (!task) return 0;
  return (uint16_t)uxTaskGetStackHighWaterMark(task);
}

void HealthMonitor::_checkHeap() {
  _metrics.freeHeap = ESP.getFreeHeap();
  _metrics.maxAllocHeap = ESP.getMaxAllocHeap();

  static uint32_t minHeap = UINT32_MAX;
  if (_metrics.freeHeap < minHeap) {
    minHeap = _metrics.freeHeap;
  }
  _metrics.minFreeHeap = minHeap;
}

void HealthMonitor::_checkTaskStacks() {
  _metrics.stackSensors = _getStackHighWater(_taskSensors);
  _metrics.stackSSR = _getStackHighWater(_taskSSR);
  _metrics.stackWiFi = _getStackHighWater(_taskWiFi);
  _metrics.stackMQTT = _getStackHighWater(_taskMQTT);
  _metrics.stackOTA = _getStackHighWater(_taskOTA);
  _metrics.stackTelemetry = _getStackHighWater(_taskTelemetry);
  _metrics.stackButton = _getStackHighWater(_taskButton);
}

void HealthMonitor::_checkI2C() {
  Wire.beginTransmission(0x38);
  uint8_t errAht = Wire.endTransmission();
  _metrics.sensorAht21 = (errAht == 0);

  Wire.beginTransmission(0x53);
  uint8_t errEns = Wire.endTransmission();
  _metrics.sensorEns160 = (errEns == 0);

  _metrics.i2cBusHealthy = (errAht == 0 || errEns == 0);

  if (!_metrics.i2cBusHealthy) {
    LOG_W("HEALTH", "I2C bus falló — intentando recuperación");
    i2cFailureCount++;
    i2cFailureHistory[i2cFailureHistoryIndex] = millis();
    i2cFailureHistoryIndex = (i2cFailureHistoryIndex + 1) % I2C_RECOVERY_TREND_WINDOW;

    _recoverI2C();
    i2cRecoveryAttempts++;

    Wire.beginTransmission(0x38);
    errAht = Wire.endTransmission();
    _metrics.sensorAht21 = (errAht == 0);

    Wire.beginTransmission(0x53);
    errEns = Wire.endTransmission();
    _metrics.sensorEns160 = (errEns == 0);

    _metrics.i2cBusHealthy = (errAht == 0 || errEns == 0);
    if (_metrics.i2cBusHealthy) {
      i2cRecoverySuccesses++;
      LOG_I("HEALTH", "I2C recuperado tras recovery");
    }

    uint32_t recentFailures = 0;
    unsigned long now = millis();
    for (int i = 0; i < I2C_RECOVERY_TREND_WINDOW; i++) {
      if (i2cFailureHistory[i] > 0 && (now - i2cFailureHistory[i]) < 300000) {
        recentFailures++;
      }
    }
    if (recentFailures >= I2C_PREDICTIVE_THRESHOLD) {
      i2cPredictiveAlert = true;
      LOG_W("HEALTH", "I2C predictive alert: %lu failures in 5min window", recentFailures);
    }
  }

  _metrics.i2cFailureCount = i2cFailureCount;
  _metrics.i2cRecoveryAttempts = i2cRecoveryAttempts;
  _metrics.i2cRecoverySuccesses = i2cRecoverySuccesses;
  _metrics.i2cPredictiveAlert = i2cPredictiveAlert;
}

void HealthMonitor::_recoverI2C() {
  pinMode(I2C_SCL, OUTPUT);
  for (int i = 0; i < 9; i++) {
    digitalWrite(I2C_SCL, LOW);
    delayMicroseconds(5);
    digitalWrite(I2C_SCL, HIGH);
    delayMicroseconds(5);
  }
  Wire.end();
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(I2C_FREQ);
  delay(10);
}

void HealthMonitor::feed(HeartbeatTaskId task) {
  if (task < HB_TASK_COUNT) {
    _lastHeartbeat[task] = millis();
  }
}

void HealthMonitor::_checkHeartbeats() {
  unsigned long now = millis();
  _metrics.staleTaskMask = 0;
  _metrics.heartbeatsHealthy = true;

  for (int i = 0; i < HB_TASK_COUNT; i++) {
    if (_lastHeartbeat[i] > 0 && (now - _lastHeartbeat[i]) > HEARTBEAT_TIMEOUT_MS) {
      _metrics.staleTaskMask |= (1 << i);
      _metrics.heartbeatsHealthy = false;
    }
  }

  if (!_metrics.heartbeatsHealthy) {
    const char* taskNames[] = {"Sensors", "SSR", "WiFi", "MQTT", "OTA", "Telemetry", "Poller", "Button"};
    for (int i = 0; i < HB_TASK_COUNT; i++) {
      if (_metrics.staleTaskMask & (1 << i)) {
        LOG_W("HEALTH", "Task %s STALE (no heartbeat >%dms)", taskNames[i], HEARTBEAT_TIMEOUT_MS);
      }
    }
  }
}

void HealthMonitor::_checkSensors() {
  _checkI2C();
}

void HealthMonitor::_publishMetrics() {
  _metrics.uptime = millis() / 1000;
  _metrics.rebootCount = sm.getRebootCount();

  if (_bus) {
    Event event;
    event.type = EVT_HEALTH_UPDATE;
    event.timestamp = millis();
    event.payload.healthUpdate.freeHeap = _metrics.freeHeap;
    event.payload.healthUpdate.minFreeHeap = _metrics.minFreeHeap;
    event.payload.healthUpdate.taskStackSensors = _metrics.stackSensors;
    event.payload.healthUpdate.taskStackSSR = _metrics.stackSSR;
    event.payload.healthUpdate.taskStackWiFi = _metrics.stackWiFi;
    event.payload.healthUpdate.taskStackMQTT = _metrics.stackMQTT;
    event.payload.healthUpdate.taskStackOTA = _metrics.stackOTA;
    event.payload.healthUpdate.taskStackTelemetry = _metrics.stackTelemetry;
    event.payload.healthUpdate.i2cHealthy = _metrics.i2cBusHealthy;
    _bus->publish(event);
  }

  // Publish health metrics via MQTT (every 60s)
  if (mqtt.isConnected()) {
    mqtt.publishHealth(
      _metrics.freeHeap, _metrics.minFreeHeap, _metrics.maxAllocHeap,
      _metrics.stackSensors, _metrics.stackSSR, _metrics.stackWiFi,
      _metrics.stackMQTT, _metrics.stackOTA, _metrics.stackTelemetry,
      _metrics.stackButton, _metrics.i2cBusHealthy,
      _metrics.sensorAht21, _metrics.sensorEns160,
      _metrics.staleTaskMask, _metrics.heartbeatsHealthy,
      _metrics.uptime, _metrics.rebootCount
    );
  }

  _healthy = (_metrics.freeHeap > 30000) &&
             (_metrics.stackSensors > 200) &&
             (_metrics.stackSSR > 200);
}

void HealthMonitor::checkQuick() {
  _checkHeap();
  _checkTaskStacks();
  _metrics.uptime = millis() / 1000;
  _publishMetrics();
}

void HealthMonitor::checkComprehensive() {
  _checkHeap();
  _checkTaskStacks();
  _checkSensors();
  _checkHeartbeats();
  _metrics.uptime = millis() / 1000;
  _publishMetrics();

  LOG_I("HEALTH", "Heap:%lu/%lu Stack(S:%u R:%u W:%u M:%u O:%u T:%u) I2C:%s HB:%s",
    _metrics.freeHeap, _metrics.minFreeHeap,
    _metrics.stackSensors, _metrics.stackSSR, _metrics.stackWiFi,
    _metrics.stackMQTT, _metrics.stackOTA, _metrics.stackTelemetry,
    _metrics.i2cBusHealthy ? "OK" : "FAIL",
    _metrics.heartbeatsHealthy ? "OK" : "STALE");
}

HealthMetrics HealthMonitor::getMetrics() {
  return _metrics;
}

bool HealthMonitor::isHealthy() {
  return _healthy;
}

void HealthMonitor::taskFunction() {
  TickType_t lastWake = xTaskGetTickCount();
  uint32_t quickCount = 0;

  while (true) {
    esp_task_wdt_reset();

    checkQuick();
    quickCount++;

    if (quickCount % 5 == 0) {
      checkComprehensive();
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(60000));
  }
}

void taskMonitor(void* pvParameters) {
  esp_err_t wdtErr = esp_task_wdt_add(NULL);
  if (wdtErr != ESP_OK) Serial.printf("[HEALTH] WDT add: %s (0x%x)\n",
    wdtErr == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", wdtErr);

  healthMonitor.taskFunction();
}
