#ifndef EVENT_BUS_H
#define EVENT_BUS_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>

enum EventType {
  EVT_SENSOR_READ,
  EVT_SENSOR_FAIL,
  EVT_ACTUATOR_CHANGE,
  EVT_STATE_CHANGE,
  EVT_ALARM,
  EVT_SETPOINT_CHANGE,
  EVT_OTA_COMMAND,
  EVT_WIFI_STATUS,
  EVT_MQTT_STATUS,
  EVT_TELEMETRY_READY,
  EVT_HEALTH_UPDATE,
  EVT_LOG,
  EVT_COUNT
};

struct SensorReadPayload {
  float temperature;
  float humidity;
  uint16_t eco2;
  uint16_t tvoc;
  uint8_t aqi;
  bool valid;
};

struct ActuatorChangePayload {
  uint8_t channel;
  uint8_t state;
  uint8_t mode;
};

struct StateChangePayload {
  int from;
  int to;
  const char* reason;
};

struct OtaCommandPayload {
  char url[256];
  char version[32];
};

struct TelemetryReadyPayload {
  float temperature;
  float humidity;
  uint16_t eco2;
  uint16_t tvoc;
  uint8_t aqi;
};

struct HealthUpdatePayload {
  uint32_t freeHeap;
  uint32_t minFreeHeap;
  uint16_t taskStackSensors;
  uint16_t taskStackSSR;
  uint16_t taskStackWiFi;
  uint16_t taskStackMQTT;
  uint16_t taskStackOTA;
  uint16_t taskStackTelemetry;
  bool i2cHealthy;
  uint8_t rebootCount;
};

struct LogPayload {
  uint8_t level;
  char tag[16];
  char message[128];
};

struct Event {
  EventType type;
  uint32_t timestamp;
  union {
    SensorReadPayload sensorRead;
    ActuatorChangePayload actuatorChange;
    StateChangePayload stateChange;
    OtaCommandPayload otaCommand;
    TelemetryReadyPayload telemetryReady;
    HealthUpdatePayload healthUpdate;
    LogPayload log;
    bool wifiStatus;
    bool mqttStatus;
    uint32_t sensorFailCount;
    int setpointChange;
  } payload;
};

typedef void (*EventCallback)(const Event& event, void* context);

class EventBus {
public:
  EventBus();
  bool init();
  bool subscribe(EventType type, EventCallback callback, void* context = nullptr);
  bool unsubscribe(EventType type, EventCallback callback);
  void publish(const Event& event);
  void publishFromISR(const Event& event);
  void loop();
  uint32_t getPendingCount();

private:
  static const int MAX_SUBSCRIBERS_PER_TYPE = 4;
  static const int EVENT_QUEUE_SIZE = 32;

  struct Subscriber {
    EventCallback callback;
    void* context;
    bool active;
  };

  struct TypeSubscribers {
    Subscriber subscribers[MAX_SUBSCRIBERS_PER_TYPE];
  };

  TypeSubscribers _typeSubscribers[EVT_COUNT];
  QueueHandle_t _eventQueue;
  SemaphoreHandle_t _subscriberMutex;
  uint32_t _pendingCount;
  bool _initialized;
};

extern EventBus eventBus;

#endif
