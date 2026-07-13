#ifndef MQTT_CMD_BUFFER_H
#define MQTT_CMD_BUFFER_H

#include <Arduino.h>
#include "config.h"

struct MqttCommand {
  uint32_t id;
  uint32_t timestamp;
  char command[32];
  char payload[128];
  bool processed;
};

class MqttCmdBuffer {
public:
  void init();
  bool push(uint32_t id, const char* command, const char* payload);
  MqttCommand* pop();
  bool hasPending();
  uint32_t count();
  void markProcessed(uint32_t id);
  void clearExpired();
  void clear();

private:
  MqttCommand _buffer[MQTT_CMD_BUFFER_SIZE];
  volatile uint8_t _head;
  volatile uint8_t _tail;
  volatile uint8_t _count;
};

extern MqttCmdBuffer mqttCmdBuffer;

#endif
