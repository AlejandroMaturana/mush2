#ifndef HEALTH_MONITOR_H
#define HEALTH_MONITOR_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include "event_bus.h"

enum HeartbeatTaskId {
  HB_SENSORS = 0,
  HB_SSR,
  HB_WIFI,
  HB_MQTT,
  HB_OTA,
  HB_TELEMETRY,
  HB_POLLER,
  HB_BUTTON,
  HB_TASK_COUNT
};

#define HEARTBEAT_TIMEOUT_MS 30000

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
  uint16_t stackButton;
  bool i2cBusHealthy;
  bool sensorAht21;
  bool sensorEns160;
  uint8_t nvsWriteErrors;
  uint32_t uptime;
  uint8_t rebootCount;
  bool heartbeatsHealthy;
  uint8_t staleTaskMask;
};

class HealthMonitor {
public:
  HealthMonitor();
  void init(EventBus* bus, TaskHandle_t sensors, TaskHandle_t ssr,
            TaskHandle_t wifi, TaskHandle_t mqtt, TaskHandle_t ota,
            TaskHandle_t telemetry, TaskHandle_t button);
  void feed(HeartbeatTaskId task);
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
  TaskHandle_t _taskButton;
  bool _healthy;
  unsigned long _lastHeartbeat[HB_TASK_COUNT];

  void _checkHeap();
  void _checkTaskStacks();
  void _checkI2C();
  void _checkSensors();
  void _checkHeartbeats();
  void _publishMetrics();
  void _recoverI2C();
  uint16_t _getStackHighWater(TaskHandle_t task);
};

extern HealthMonitor healthMonitor;

void taskMonitor(void* pvParameters);

#endif
