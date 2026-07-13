#include "mqtt_cmd_buffer.h"
#include "tasks.h"

MqttCmdBuffer mqttCmdBuffer;

void MqttCmdBuffer::init() {
  _head = 0;
  _tail = 0;
  _count = 0;
  memset(_buffer, 0, sizeof(_buffer));
  Serial.println("[CMD_BUFFER] Inicializado");
}

bool MqttCmdBuffer::push(uint32_t id, const char* command, const char* payload) {
  if (_count >= MQTT_CMD_BUFFER_SIZE) {
    Serial.println("[CMD_BUFFER] Buffer lleno — comando descartado");
    return false;
  }

  MqttCommand* cmd = &_buffer[_head];
  cmd->id = id;
  cmd->timestamp = millis();
  strncpy(cmd->command, command, sizeof(cmd->command) - 1);
  cmd->command[sizeof(cmd->command) - 1] = '\0';
  strncpy(cmd->payload, payload, sizeof(cmd->payload) - 1);
  cmd->payload[sizeof(cmd->payload) - 1] = '\0';
  cmd->processed = false;

  _head = (_head + 1) % MQTT_CMD_BUFFER_SIZE;
  _count++;
  mqttCmdBufferHasData = true;
  mqttCmdBufferCount = _count;

  Serial.printf("[CMD_BUFFER] Push: id=%u cmd=%s (count=%u)\n", id, command, _count);
  return true;
}

MqttCommand* MqttCmdBuffer::pop() {
  if (_count == 0) return nullptr;

  MqttCommand* cmd = &_buffer[_tail];
  _tail = (_tail + 1) % MQTT_CMD_BUFFER_SIZE;
  _count--;
  mqttCmdBufferCount = _count;
  if (_count == 0) mqttCmdBufferHasData = false;

  return cmd;
}

bool MqttCmdBuffer::hasPending() {
  return _count > 0;
}

uint32_t MqttCmdBuffer::count() {
  return _count;
}

void MqttCmdBuffer::markProcessed(uint32_t id) {
  for (uint8_t i = 0; i < MQTT_CMD_BUFFER_SIZE; i++) {
    if (_buffer[i].id == id && !_buffer[i].processed) {
      _buffer[i].processed = true;
      Serial.printf("[CMD_BUFFER] Marked processed: id=%u\n", id);
      break;
    }
  }
}

void MqttCmdBuffer::clearExpired() {
  unsigned long now = millis();
  uint32_t cleared = 0;

  for (uint8_t i = 0; i < MQTT_CMD_BUFFER_SIZE; i++) {
    if (_buffer[i].id != 0 && !_buffer[i].processed &&
        (now - _buffer[i].timestamp > MQTT_CMD_TTL_MS)) {
      _buffer[i].processed = true;
      cleared++;
    }
  }

  if (cleared > 0) {
    Serial.printf("[CMD_BUFFER] Cleared %u expired commands\n", cleared);
  }
}

void MqttCmdBuffer::clear() {
  _head = 0;
  _tail = 0;
  _count = 0;
  memset(_buffer, 0, sizeof(_buffer));
  mqttCmdBufferHasData = false;
  mqttCmdBufferCount = 0;
  Serial.println("[CMD_BUFFER] Cleared");
}
