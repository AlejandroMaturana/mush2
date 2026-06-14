#include "mqtt_handler.h"
#include "config.h"
#include <ArduinoJson.h>

void (*MQTTHandler::commandCallback)(const char*, int, const char*) = nullptr;
void (*MQTTHandler::configCallback)(const char*, JsonDocument&) = nullptr;
void (*MQTTHandler::otaCallback)(const char*, const char*, const char*) = nullptr;

MQTTHandler::MQTTHandler() : client(wifiClient) {
  brokers[0] = MQTT_BROKER;
  brokers[1] = MQTT_BROKER_FALLBACK;
  brokerPorts[0] = MQTT_PORT;
  brokerPorts[1] = MQTT_PORT_FALLBACK;
  currentBroker = 0;
  lastReconnect = 0;
  backoffDelay = BACKOFF_MIN;
}

void MQTTHandler::init(const char* id) {
  deviceId = String(id);
  client.setKeepAlive(30);
  client.setCallback(MQTTHandler::onMessage);
  setupTopics();
}

void MQTTHandler::setupTopics() {
}

void MQTTHandler::setCallback(MQTT_CALLBACK_SIGNATURE) {
  client.setCallback(callback);
}

void MQTTHandler::setCommandCallback(void (*cb)(const char*, int, const char*)) {
  commandCallback = cb;
}

void MQTTHandler::setConfigCallback(void (*cb)(const char*, JsonDocument&)) {
  configCallback = cb;
}

void MQTTHandler::setOTACallback(void (*cb)(const char*, const char*, const char*)) {
  otaCallback = cb;
}

bool MQTTHandler::connectToBroker(int index) {
  Serial.printf("[MQTT] Conectando a %s:%d...\n", brokers[index], brokerPorts[index]);
  client.setServer(brokers[index], brokerPorts[index]);

  String clientId = "mush2_" + deviceId + "_" + String(random(0xffff), HEX);
  String willTopic = "mush2/state/" + deviceId + "/online";
  String willPayload = "{\"deviceId\":\"" + deviceId + "\",\"status\":\"OFFLINE\",\"ts\":" + String(millis() / 1000) + "}";

  if (client.connect(clientId.c_str(), NULL, NULL, willTopic.c_str(), 1, true, willPayload.c_str())) {
    Serial.printf("[MQTT] Conectado a %s\n", brokers[index]);
    backoffDelay = BACKOFF_MIN;

    String cmdTopic = "mush2/cmd/" + deviceId + "/actuator";
    String configTopic = "mush2/cmd/" + deviceId + "/config";
    String otaTopic = "mush2/cmd/" + deviceId + "/ota";
    client.subscribe(cmdTopic.c_str(), 1);
    client.subscribe(configTopic.c_str(), 1);
    client.subscribe(otaTopic.c_str(), 1);

    publishBoot();
    publishOnline(true);

    return true;
  }

  Serial.printf("[MQTT] Falló conexión a %s: %d\n", brokers[index], client.state());
  return false;
}

void MQTTHandler::onMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String payloadStr = "";
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  if (!commandCallback && !configCallback) return;

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payloadStr);
  if (error) return;

  const char* cmdId = doc["cmdId"] | "";
  const char* target = doc["target"] | "";

  if (strcmp(target, "actuator") == 0) {
    if (commandCallback) {
      int channel = doc["channel"] | 0;
      const char* command = doc["command"] | "";
      commandCallback(cmdId, channel, command);
    }
  } else if (strcmp(target, "config") == 0) {
    if (configCallback) {
      configCallback(cmdId, doc);
    }
  } else if (strcmp(target, "ota") == 0) {
    const char* action = doc["action"] | "";
    const char* url = doc["url"] | "";
    if (otaCallback) {
      otaCallback(cmdId, action, url);
    }
  }
}

void MQTTHandler::loop() {
  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnect < backoffDelay) return;
    lastReconnect = now;

    if (!connectToBroker(currentBroker)) {
      currentBroker = (currentBroker + 1) % 2;
      backoffDelay = min(backoffDelay * 2, BACKOFF_MAX);
      Serial.printf("[MQTT] Reintento en %ums\n", backoffDelay);
      return;
    }
    backoffDelay = BACKOFF_MIN;
    return;
  }
  client.loop();
}

bool MQTTHandler::isConnected() {
  return client.connected();
}

bool MQTTHandler::publish(const char* topic, const char* payload, bool retain) {
  if (!client.connected()) return false;
  return client.publish(topic, payload, retain);
}

bool MQTTHandler::publishTelemetry(const char* payload) {
  String topic = "mush2/telemetry/" + deviceId + "/sensors";
  return publish(topic.c_str(), payload, false);
}

bool MQTTHandler::publishState(const char* payload) {
  String topic = "mush2/telemetry/" + deviceId + "/state";
  return publish(topic.c_str(), payload, true);
}

bool MQTTHandler::publishBoot() {
  String topic = "mush2/event/" + deviceId + "/boot";
  String payload = "{\"protocol\":\"1.0.0\",\"deviceId\":\"" + deviceId
    + "\",\"ts\":" + String(millis() / 1000)
    + ",\"event\":\"BOOT\",\"bootCount\":0,\"fwVersion\":\"0.1.0\"}";
  return publish(topic.c_str(), payload.c_str(), false);
}

bool MQTTHandler::publishAck(const char* cmdId, const char* status, const char* channelInfo) {
  String topic = "mush2/event/" + deviceId + "/ack";
  String payload = "{\"protocol\":\"1.0.0\",\"cmdId\":\"" + String(cmdId)
    + "\",\"deviceId\":\"" + deviceId
    + "\",\"ts\":" + String(millis() / 1000)
    + ",\"status\":\"" + String(status)
    + "\",\"actuatorState\":{" + String(channelInfo) + "}}";
  return publish(topic.c_str(), payload.c_str(), false);
}

bool MQTTHandler::publishAlarm(const char* reason) {
  String topic = "mush2/event/" + deviceId + "/alarm";
  String payload = "{\"protocol\":\"1.0.0\",\"deviceId\":\"" + deviceId
    + "\",\"ts\":" + String(millis() / 1000)
    + ",\"event\":\"ALARM\",\"reason\":\"" + String(reason) + "\"}";
  return publish(topic.c_str(), payload.c_str(), false);
}

bool MQTTHandler::publishConfigAck(const char* cmdId, const char* status) {
  String topic = "mush2/event/" + deviceId + "/ack";
  String payload = "{\"protocol\":\"1.0.0\",\"cmdId\":\"" + String(cmdId)
    + "\",\"deviceId\":\"" + deviceId
    + "\",\"ts\":" + String(millis() / 1000)
    + ",\"status\":\"" + String(status) + "\"}";
  return publish(topic.c_str(), payload.c_str(), false);
}

bool MQTTHandler::publishOnline(bool online) {
  String topic = "mush2/state/" + deviceId + "/online";
  String payload = "{\"deviceId\":\"" + deviceId
    + "\",\"status\":\"" + String(online ? "ONLINE" : "OFFLINE")
    + "\",\"ts\":" + String(millis() / 1000) + "}";
  return publish(topic.c_str(), payload.c_str(), true);
}
