#include "mqtt_client.h"
#include "config.h"
#include <ArduinoJson.h>

MQTTClient* MQTTClient::_instance = nullptr;

MQTTClient::MQTTClient()
  : _client(_tcpClient), _lastReconnect(0), _otaCb(nullptr) {
  _deviceId[0] = '\0';
  _topicBase[0] = '\0';
}

void MQTTClient::init(const char* deviceId) {
  snprintf(_deviceId, sizeof(_deviceId), "%s", deviceId);
  snprintf(_topicBase, sizeof(_topicBase), "mush2/%s", deviceId);

  _client.setServer(MQTT_BROKER, MQTT_PORT);
  _client.setCallback(_staticCallback);
  _instance = this;
}

void MQTTClient::setOtaCallback(void (*cb)(const char* url, const char* version)) {
  _otaCb = cb;
}

void MQTTClient::loop() {
  if (!_client.connected()) {
    unsigned long now = millis();
    if (now - _lastReconnect > 10000) {
      _lastReconnect = now;
      _connect();
    }
    return;
  }
  _client.loop();
}

bool MQTTClient::isConnected() {
  return _client.connected();
}

bool MQTTClient::publish(const char* topic, const char* payload, bool retained) {
  if (!_client.connected()) return false;
  char fullTopic[96];
  snprintf(fullTopic, sizeof(fullTopic), "%s/%s", _topicBase, topic);
  return _client.publish(fullTopic, payload, retained);
}

void MQTTClient::_connect() {
  if (WiFi.status() != WL_CONNECTED) return;

  char clientId[40];
  snprintf(clientId, sizeof(clientId), "%s", _deviceId);

  Serial.printf("[MQTT] Conectando a %s:%d como %s...\n", MQTT_BROKER, MQTT_PORT, clientId);

  if (_client.connect(clientId)) {
    Serial.printf("[MQTT] Conectado como %s\n", clientId);

    char topic[96];
    snprintf(topic, sizeof(topic), "%s/ota/command", _topicBase);
    _client.subscribe(topic);
    Serial.printf("[MQTT] Suscrito a %s\n", topic);
  } else {
    Serial.printf("[MQTT] Fallo conexion, rc=%d\n", _client.state());
  }
}

void MQTTClient::_staticCallback(char* topic, uint8_t* payload, unsigned int len) {
  if (_instance) {
    _instance->_onMessage(topic, payload, len);
  }
}

void MQTTClient::_onMessage(char* topic, uint8_t* payload, unsigned int len) {
  char cmdTopic[96];
  snprintf(cmdTopic, sizeof(cmdTopic), "%s/ota/command", _topicBase);

  if (strcmp(topic, cmdTopic) != 0) return;

  String jsonStr;
  for (unsigned int i = 0; i < len; i++) {
    jsonStr += (char)payload[i];
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) {
    Serial.printf("[MQTT] Error parseando ota/command: %s\n", err.c_str());
    return;
  }

  const char* url = doc["url"];
  const char* version = doc["version"];

  if (!url || !version) {
    Serial.println("[MQTT] ota/command: faltan url o version");
    return;
  }

  Serial.printf("[MQTT] Comando OTA recibido: url=%s, version=%s\n", url, version);

  if (_otaCb) {
    _otaCb(url, version);
  }
}
