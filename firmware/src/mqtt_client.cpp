#include "mqtt_client.h"
#include "config.h"
#include <ArduinoJson.h>

MQTTClient* MQTTClient::_instance = nullptr;

MQTTClient::MQTTClient()
  : _client(_tcpClient), _lastReconnect(0), _fallbackRetry(0),
    _usingFallback(false), _otaCb(nullptr), _actuatorCb(nullptr) {
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

void MQTTClient::setOtaCallback(void (*cb)(const char* url, const char* version, const char* hash)) {
  _otaCb = cb;
}

void MQTTClient::setActuatorCallback(void (*cb)(const MqttActuatorMessage* msg)) {
  _actuatorCb = cb;
}

void MQTTClient::loop() {
  if (!_client.connected()) {
    unsigned long now = millis();

    if (!_usingFallback) {
      if (now - _lastReconnect > 10000) {
        _lastReconnect = now;
        _connect();
      }
    } else {
      if (now - _fallbackRetry > 300000) {
        _fallbackRetry = now;
        _usingFallback = false;
        _client.setServer(MQTT_BROKER, MQTT_PORT);
        _lastReconnect = 0;
      }
      if (now - _lastReconnect > 30000) {
        _lastReconnect = now;
        _connect();
      }
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

bool MQTTClient::publishTelemetry(float temp, float hum, uint16_t eco2, uint16_t tvoc, uint8_t aqi) {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"temp\":%.1f,\"hum\":%.1f,\"co2\":%u,\"tvoc\":%u,\"aqi\":%u,\"ts\":%lu}",
    temp, hum, eco2, tvoc, aqi, millis());
  return publish("telemetry", payload);
}

bool MQTTClient::publishStatus(const char* state, const char* mode, int rssi, const char* mac, const char* fwVer, const char* hwRev) {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"state\":\"%s\",\"mode\":\"%s\",\"rssi\":%d,\"mac\":\"%s\",\"fwVer\":\"%s\",\"hwRev\":\"%s\",\"ts\":%lu}",
    state, mode, rssi, mac, fwVer, hwRev, millis());
  return publish("status", payload);
}

bool MQTTClient::publishAlarm(const char* reason) {
  char payload[128];
  snprintf(payload, sizeof(payload),
    "{\"reason\":\"%s\",\"ts\":%lu}", reason, millis());
  return publish("alarm", payload);
}

bool MQTTClient::publishHealth(uint32_t freeHeap, uint32_t minFreeHeap, uint32_t maxAllocHeap,
                               uint16_t stackSensors, uint16_t stackSSR, uint16_t stackWiFi,
                               uint16_t stackMQTT, uint16_t stackOTA, uint16_t stackTelemetry,
                               uint16_t stackButton, bool i2cHealthy, bool sensorAht21, bool sensorEns160,
                               uint8_t staleTaskMask, bool heartbeatsHealthy, uint32_t uptime, uint8_t rebootCount) {
  char payload[512];
  snprintf(payload, sizeof(payload),
    "{\"freeHeap\":%lu,\"minFreeHeap\":%lu,\"maxAllocHeap\":%lu,"
    "\"stack\":{"
      "\"sensors\":%u,\"ssr\":%u,\"wifi\":%u,"
      "\"mqtt\":%u,\"ota\":%u,\"telemetry\":%u,\"button\":%u"
    "},"
    "\"i2cHealthy\":%s,\"sensorAht21\":%s,\"sensorEns160\":%s,"
    "\"staleTaskMask\":%u,\"heartbeatsHealthy\":%s,"
    "\"uptime\":%lu,\"rebootCount\":%u,"
    "\"ts\":%lu}",
    freeHeap, minFreeHeap, maxAllocHeap,
    stackSensors, stackSSR, stackWiFi,
    stackMQTT, stackOTA, stackTelemetry, stackButton,
    i2cHealthy ? "true" : "false",
    sensorAht21 ? "true" : "false",
    sensorEns160 ? "true" : "false",
    staleTaskMask,
    heartbeatsHealthy ? "true" : "false",
    uptime, rebootCount,
    millis());
  return publish("health", payload);
}

void MQTTClient::_connect() {
  if (WiFi.status() != WL_CONNECTED) return;

  const char* brokerLabel = _usingFallback ? "FALLBACK" : "PRIMARY";
  const char* brokerHost = _usingFallback ? MQTT_BROKER_FALLBACK : MQTT_BROKER;
  uint16_t brokerPort = _usingFallback ? MQTT_PORT_FALLBACK : MQTT_PORT;

  char clientId[40];
  snprintf(clientId, sizeof(clientId), "%s_%lu", _deviceId, millis() % 100000);

  Serial.printf("[MQTT] Conectando a %s (%s:%d)...\n", brokerLabel, brokerHost, brokerPort);

  _client.setServer(brokerHost, brokerPort);

  if (_client.connect(clientId)) {
    Serial.printf("[MQTT] Conectado como %s via %s\n", clientId, brokerLabel);

    char otaTopic[96];
    snprintf(otaTopic, sizeof(otaTopic), "%s/ota/command", _topicBase);
    _client.subscribe(otaTopic);

    char actTopic[96];
    snprintf(actTopic, sizeof(actTopic), "%s/actuators", _topicBase);
    _client.subscribe(actTopic);

    Serial.printf("[MQTT] Suscrito a %s, %s\n", otaTopic, actTopic);

    publish("status", "{\"status\":\"ONLINE\"}", false);
  } else {
    Serial.printf("[MQTT] Fallo conexion %s, rc=%d\n", brokerLabel, _client.state());

    if (!_usingFallback) {
#ifdef MQTT_BROKER_FALLBACK
      _usingFallback = true;
      _fallbackRetry = millis();
      Serial.println("[MQTT] Cambiando a broker FALLBACK");
#endif
    }
  }
}

void MQTTClient::_staticCallback(char* topic, uint8_t* payload, unsigned int len) {
  if (_instance) {
    _instance->_onMessage(topic, payload, len);
  }
}

void MQTTClient::_onMessage(char* topic, uint8_t* payload, unsigned int len) {
  char otaTopic[96];
  snprintf(otaTopic, sizeof(otaTopic), "%s/ota/command", _topicBase);

  char actTopic[96];
  snprintf(actTopic, sizeof(actTopic), "%s/actuators", _topicBase);

  if (strcmp(topic, otaTopic) == 0) {
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
    const char* hash = doc["hash"] | nullptr;

    if (!url || !version) {
      Serial.println("[MQTT] ota/command: faltan url o version");
      return;
    }

    Serial.printf("[MQTT] Comando OTA: url=%s, version=%s, hash=%s\n",
      url, version, hash ? hash : "none");

    if (_otaCb) {
      _otaCb(url, version, hash);
    }
    return;
  }

  if (strcmp(topic, actTopic) == 0) {
    String jsonStr;
    for (unsigned int i = 0; i < len; i++) {
      jsonStr += (char)payload[i];
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, jsonStr);
    if (err) {
      Serial.printf("[MQTT] Error parseando actuators: %s\n", err.c_str());
      return;
    }

    JsonArray acts = doc["actuators"].as<JsonArray>();
    if (acts.isNull()) {
      Serial.println("[MQTT] actuators: falta array 'actuators'");
      return;
    }

    int count = acts.size();
    if (count > 4) count = 4;
    ActuatorCommand cmds[4];

    for (int i = 0; i < count; i++) {
      JsonObject a = acts[i];
      cmds[i].channel = a["channel"] | 0;
      cmds[i].state = (strcmp(a["state"] | "OFF", "ON") == 0) ? 1 : 0;
      cmds[i].mode = (strcmp(a["mode"] | "LOCAL", "REMOTE") == 0) ? 1 : 0;
    }

    MqttActuatorMessage msg;
    msg.cmds = cmds;
    msg.cmdCount = count;
    msg.status = doc["status"] | "";
    msg.phase = doc["phase"] | "";

    if (doc["setpoints"].is<JsonObject>()) {
      JsonObject sp = doc["setpoints"];
      msg.hasSetpoints = true;
      msg.tempMin = sp["tempMin"] | 0.0f;
      msg.tempMax = sp["tempMax"] | 0.0f;
      msg.humMin = sp["humMin"] | 0.0f;
      msg.humMax = sp["humMax"] | 0.0f;
      msg.co2Max = sp["co2Max"] | 0;
    } else {
      msg.hasSetpoints = false;
    }

    if (_actuatorCb) {
      _actuatorCb(&msg);
    }
    return;
  }
}
