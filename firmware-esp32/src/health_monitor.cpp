#include "health_monitor.h"
#include "logger.h"
#include <Wire.h>

HealthMonitor healthMonitor;

HealthMonitor::HealthMonitor()
  : _bus(nullptr), _taskSensors(nullptr), _taskSSR(nullptr),
    _taskWiFi(nullptr), _taskMQTT(nullptr), _taskOTA(nullptr),
    _taskTelemetry(nullptr), _healthy(true) {
  memset(&_metrics, 0, sizeof(_metrics));
}

void HealthMonitor::init(EventBus* bus, TaskHandle_t sensors, TaskHandle_t ssr,
                         TaskHandle_t wifi, TaskHandle_t mqtt, TaskHandle_t ota,
                         TaskHandle_t telemetry) {
  _bus = bus;
  _taskSensors = sensors;
  _taskSSR = ssr;
  _taskWiFi = wifi;
  _taskMQTT = mqtt;
  _taskOTA = ota;
  _taskTelemetry = telemetry;
  LOG_I("HEALTH", "HealthMonitor inicializado");
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
}

void HealthMonitor::_checkI2C() {
  Wire.beginTransmission(0x38);
  uint8_t errAht = Wire.endTransmission();
  _metrics.sensorAht21 = (errAht == 0);

  Wire.beginTransmission(0x53);
  uint8_t errEns = Wire.endTransmission();
  _metrics.sensorEns160 = (errEns == 0);

  _metrics.i2cBusHealthy = (errAht == 0 || errEns == 0);
}

void HealthMonitor::_checkSensors() {
  _checkI2C();
}

void HealthMonitor::_publishMetrics() {
  _metrics.uptime = millis() / 1000;

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
  _metrics.uptime = millis() / 1000;
  _publishMetrics();

  LOG_I("HEALTH", "Heap:%lu/%lu Stack(S:%u R:%u W:%u M:%u O:%u T:%u) I2C:%s",
    _metrics.freeHeap, _metrics.minFreeHeap,
    _metrics.stackSensors, _metrics.stackSSR, _metrics.stackWiFi,
    _metrics.stackMQTT, _metrics.stackOTA, _metrics.stackTelemetry,
    _metrics.i2cBusHealthy ? "OK" : "FAIL");
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
