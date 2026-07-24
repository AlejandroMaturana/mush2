#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

#if MQTT_USE_TLS == 1
  #include <WiFiClientSecure.h>
#endif

struct ActuatorCommand {
  uint8_t channel;
  uint8_t state;
  uint8_t mode;
};

struct MqttActuatorMessage {
  const ActuatorCommand* cmds;
  int cmdCount;
  const char* status;
  const char* phase;
  bool hasSetpoints;
  float tempMin, tempMax, humMin, humMax;
  uint16_t co2Max;
};

class MQTTClient {
public:
  MQTTClient();
  void init(const char* deviceId);
  void loop();
  bool isConnected();

  bool publish(const char* topic, const char* payload, bool retained = false);
  bool publishTelemetry(float temp, float hum, uint16_t eco2, uint16_t tvoc, uint8_t aqi);
  bool publishStatus(const char* state, const char* mode, int rssi, const char* mac = "", const char* fwVer = "", const char* hwRev = "");
  bool publishAlarm(const char* reason);
  bool publishHealth(uint32_t freeHeap, uint32_t minFreeHeap, uint32_t maxAllocHeap,
                     uint16_t stackSensors, uint16_t stackSSR, uint16_t stackWiFi,
                     uint16_t stackMQTT, uint16_t stackOTA, uint16_t stackTelemetry,
                     uint16_t stackButton, bool i2cHealthy, bool sensorAht21, bool sensorEns160,
                     uint8_t staleTaskMask, bool heartbeatsHealthy, uint32_t uptime, uint8_t rebootCount,
                     bool bootTestPassed, const char* bootTestFailReason);
  bool publishMaintenance(const char* component, uint8_t health, uint32_t estimatedFailure, const char* reason);

  void setOtaCallback(void (*cb)(const char* url, const char* version, const char* hash));
  void setActuatorCallback(void (*cb)(const MqttActuatorMessage* msg));

private:
  #if MQTT_USE_TLS == 1
    WiFiClientSecure _tcpClient;
  #else
    WiFiClient _tcpClient;
  #endif
  PubSubClient _client;
  char _deviceId[32];
  char _topicBase[48];
  unsigned long _lastReconnect;
  unsigned long _reconnectDelay;
  bool _wasConnected;

  void (*_otaCb)(const char* url, const char* version, const char* hash);
  void (*_actuatorCb)(const MqttActuatorMessage* msg);

  void _connect();
  void _publishOnline();
  void _onMessage(char* topic, uint8_t* payload, unsigned int len);
  static void _staticCallback(char* topic, uint8_t* payload, unsigned int len);
  static MQTTClient* _instance;
};

#endif
