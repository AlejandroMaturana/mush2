#ifndef HEALTH_MONITOR_H
#define HEALTH_MONITOR_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include "event_bus.h"

struct HealthMetrics {
  uint32_t freeHeap;
  uint32_t minFreeHeap;
  uint32_t maxAllocHeap;
  uint16_t stackSensors;
  uint16_t stackSSR;
  uint16_t stackWiFi;
  uint16_t stackMQTT;
  uint16_t stackOTA;
  uint16_t stackTelemetry;
  bool i2cBusHealthy;
  bool sensorAht21;
  bool sensorEns160;
  uint8_t nvsWriteErrors;
  uint32_t uptime;
  uint8_t rebootCount;
};

class HealthMonitor {
public:
  HealthMonitor();
  void init(EventBus* bus, TaskHandle_t sensors, TaskHandle_t ssr,
            TaskHandle_t wifi, TaskHandle_t mqtt, TaskHandle_t ota,
            TaskHandle_t telemetry);
  void checkQuick();
  void checkComprehensive();
  HealthMetrics getMetrics();
  bool isHealthy();
  void taskFunction();

private:
  EventBus* _bus;
  HealthMetrics _metrics;
  TaskHandle_t _taskSensors;
  TaskHandle_t _taskSSR;
  TaskHandle_t _taskWiFi;
  TaskHandle_t _taskMQTT;
  TaskHandle_t _taskOTA;
  TaskHandle_t _taskTelemetry;
  bool _healthy;

  void _checkHeap();
  void _checkTaskStacks();
  void _checkI2C();
  void _checkSensors();
  void _publishMetrics();
  uint16_t _getStackHighWater(TaskHandle_t task);
};

extern HealthMonitor healthMonitor;

void taskMonitor(void* pvParameters);

#endif
