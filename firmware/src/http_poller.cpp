#include "http_poller.h"
#include "config.h"

HTTPPoller::HTTPPoller() : client() {
  deviceId = "";
  lastPoll = 0;
  pollInterval = POLL_INTERVAL;
  failBackoff = 5000;
  lastPollOk = false;
  failCount = 0;
  pollState = POLL_IDLE;
  pollDeadline = 0;
  bodyStarted = false;
  memset(hdrBuf, 0, 4);
  _ssrActiveLow = true;
  _ssrActiveLowPrev = true;
  _hasActiveCycle = false;
  _hasSetpoints = false;
  _setpointsChanged = false;
  _tempMin = 0; _tempMax = 0; _humMin = 0; _humMax = 0; _co2Max = 0;
  _phase[0] = '\0';
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    desired[i].state = 0;
    desired[i].mode = 0;
  }
}

void HTTPPoller::init(const char* id, const char* h, uint16_t p) {
  deviceId = String(id);
  host = String(h);
  port = p;
  client.setTimeout(3000);
}

bool HTTPPoller::registerDevice(const char* fwVersion, const char* macAddress, const char* hwRevision) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient regClient;
  regClient.setTimeout(5000);

  if (!regClient.connect(host.c_str(), port)) {
    Serial.printf("[REG] Fallo conexión a %s:%u\n", host.c_str(), port);
    return false;
  }

  String body;
  body += "{\"deviceId\":\"";
  body += deviceId;
  body += "\",\"macAddress\":\"";
  body += macAddress;
  body += "\",\"firmwareVersion\":\"";
  body += fwVersion;
  body += "\",\"hwRevision\":\"";
  body += hwRevision;
  body += "\"}";

  regClient.printf("POST /api/v1/devices/register HTTP/1.1\r\n"
    "Host: %s:%u\r\n"
    "Content-Type: application/json\r\n"
    "Content-Length: %u\r\n"
    "Connection: close\r\n\r\n%s",
    host.c_str(), port, body.length(), body.c_str());

  unsigned long deadline = millis() + 5000;
  while (!regClient.available() && millis() < deadline) {
    vTaskDelay(pdMS_TO_TICKS(10));
  }

  if (!regClient.available()) {
    Serial.println("[REG] Timeout esperando respuesta");
    regClient.stop();
    return false;
  }

  String response;
  while (regClient.available()) {
    response += (char)regClient.read();
  }
  regClient.stop();

  bool ok = response.indexOf("200 OK") >= 0 || response.indexOf("201 Created") >= 0;
  Serial.printf("[REG] Dispositivo %s: %s\n", ok ? "registrado" : "falló", deviceId.c_str());
  return ok;
}

void HTTPPoller::loop() {
  switch (pollState) {
    case POLL_IDLE:
      beginRequest();
      break;
    case POLL_CONNECT:
      runConnect();
      break;
    case POLL_SEND:
      runSend();
      break;
    case POLL_WAIT:
      runWait();
      break;
    case POLL_READ:
      runRead();
      break;
    case POLL_PARSE:
      runParse();
      break;
  }
}

bool HTTPPoller::isConnected() {
  return lastPollOk && WiFi.status() == WL_CONNECTED;
}

void HTTPPoller::getDesired(int ch, uint8_t* state, uint8_t* mode) {
  if (ch < 1 || ch > ACTUATOR_CHANNELS) {
    *state = 0;
    *mode = 0;
    return;
  }
  int idx = ch - 1;
  *state = desired[idx].state;
  *mode = desired[idx].mode;
}

void HTTPPoller::beginRequest() {
  unsigned long now = millis();
  unsigned long interval = lastPollOk ? pollInterval : failBackoff;
  if (now - lastPoll < interval) return;
  lastPoll = now;

  if (WiFi.status() != WL_CONNECTED) {
    failCount++;
    lastPollOk = false;
    return;
  }

  client.stop();
  pollState = POLL_CONNECT;
  pollDeadline = now + 5000;
}

void HTTPPoller::runConnect() {
  unsigned long now = millis();
  if (now >= pollDeadline) {
    Serial.println("[POLL] Timeout de conexión TCP");
    client.stop();
    httpResponse = "";
    bodyStarted = false;
    memset(hdrBuf, 0, 4);
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  if (!client.connected()) {
    int result = client.connect(host.c_str(), port, 5000);
    if (!client.connected()) {
      if (result == 0) {
        Serial.printf("[POLL] Fallo connect() a %s:%u (timeout o RST)\n", host.c_str(), port);
      }
      vTaskDelay(1);
      return;
    }
  }

#if POLL_DEBUG
  Serial.printf("[POLL] TCP conectado a %s:%u\n", host.c_str(), port);
#endif
  vTaskDelay(pdMS_TO_TICKS(50));
  pollState = POLL_SEND;
}

void HTTPPoller::runSend() {
  String path = "/api/v1/actuators?deviceId=" + deviceId;
  int sent = client.printf("GET %s HTTP/1.1\r\nHost: %s:%u\r\nConnection: close\r\n\r\n",
    path.c_str(), host.c_str(), port);

  if (sent <= 0) {
    Serial.println("[POLL] Error enviando petición HTTP");
    client.stop();
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  client.flush();
#if POLL_DEBUG
  Serial.printf("[POLL] Enviados %d bytes\n", sent);
#endif

  httpResponse = "";
  bodyStarted = false;
  memset(hdrBuf, 0, 4);
  pollState = POLL_WAIT;
  pollDeadline = millis() + 5000;
}

void HTTPPoller::runWait() {
  if (millis() >= pollDeadline) {
    Serial.println("[POLL] Timeout esperando respuesta");
    client.stop();
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  int avail = client.available();
  bool conn = client.connected();

  // Leer datos disponibles incluso si el servidor ya cerró la conexión
  if (avail > 0) {
#if POLL_DEBUG
    Serial.printf("[POLL] Datos disponibles: %d bytes (connected=%d)\n", avail, conn ? 1 : 0);
#endif
    pollState = POLL_READ;
    pollDeadline = millis() + 3000;
    return;
  }

  if (!conn) {
    if (client.available()) {
      avail = client.available();
#if POLL_DEBUG
      Serial.printf("[POLL] Datos post-close: %d bytes\n", avail);
#endif
      pollState = POLL_READ;
      pollDeadline = millis() + 3000;
      return;
    }
    Serial.println("[POLL] Desconectado sin datos pendientes");
    client.stop();
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  vTaskDelay(1);
}

void HTTPPoller::runRead() {
  unsigned long now = millis();

  if (now >= pollDeadline) {
    Serial.printf("[POLL] Timeout leyendo (bodyStarted=%d, len=%u)\n",
      bodyStarted ? 1 : 0, httpResponse.length());
    client.stop();
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  while (client.available()) {
    char c = client.read();
    if (!bodyStarted) {
      memmove(hdrBuf, hdrBuf + 1, 3);
      hdrBuf[3] = c;
      if (memcmp(hdrBuf, "\r\n\r\n", 4) == 0) {
        bodyStarted = true;
        memset(hdrBuf, 0, 4);
      }
    } else {
      httpResponse += c;
    }
  }

  if (!client.connected() && !client.available()) {
    if (bodyStarted && httpResponse.length() > 0) {
      client.stop();
#if POLL_DEBUG
      Serial.printf("[POLL] Respuesta recibida (%u bytes)\n", httpResponse.length());
#endif
      pollState = POLL_PARSE;
    } else {
      Serial.println("[POLL] Desconectado sin body");
      client.stop();
      failCount++;
      pollState = POLL_IDLE;
      lastPollOk = false;
    }
    return;
  }

  vTaskDelay(1);
}

void HTTPPoller::runParse() {
  if (httpResponse.length() == 0) {
    Serial.println("[POLL] Respuesta vacía del servidor");
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  // De-chunk transfer-encoding chunked si es necesario
  String body = httpResponse;
  if (body[0] >= '0' && body[0] <= '9' || body[0] >= 'a' && body[0] <= 'f') {
    int cr = body.indexOf('\r');
    int nl = body.indexOf('\n');
    int hdrEnd;
    if (cr >= 0 && nl >= 0 && nl == cr + 1) {
      hdrEnd = nl + 1;
    } else if (nl >= 0) {
      hdrEnd = nl + 1;
    } else {
      hdrEnd = 0;
    }
    if (hdrEnd > 0) {
      String chunkSizeStr = body.substring(0, hdrEnd - 1);
      chunkSizeStr.trim();
      long chunkSize = strtol(chunkSizeStr.c_str(), NULL, 16);
      if (chunkSize > 0 && (unsigned long)chunkSize <= body.length() - hdrEnd) {
        body = body.substring(hdrEnd, hdrEnd + chunkSize);
#if POLL_DEBUG
        Serial.printf("[POLL] De-chunked: %d bytes\n", chunkSize);
#endif
      }
    }
  }

  if (body.length() == 0) {
    Serial.println("[POLL] Body vacío tras de-chunk");
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  Serial.printf("[POLL] Body (%u bytes)\n", body.length());

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.printf("[POLL] JSON inválido: %s\n", err.c_str());
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  // Parse cycle status and setpoints (v0.14.0 protocol)
  _setpointsChanged = false;
  if (doc["status"].is<const char*>()) {
    const char* status = doc["status"];
    _hasActiveCycle = (strcmp(status, "active") == 0);

    if (doc["phase"].is<const char*>()) {
      strncpy(_phase, doc["phase"], sizeof(_phase) - 1);
    } else {
      _phase[0] = '\0';
    }

    if (_hasActiveCycle && doc["setpoints"].is<JsonObject>()) {
      JsonObject sp = doc["setpoints"];
      float newMin = sp["tempMin"] | _tempMin;
      float newMax = sp["tempMax"] | _tempMax;
      float newHMin = sp["humMin"] | _humMin;
      float newHMax = sp["humMax"] | _humMax;
      uint16_t newCO2 = sp["co2Max"] | _co2Max;

      if (newMin != _tempMin || newMax != _tempMax ||
          newHMin != _humMin || newHMax != _humMax ||
          newCO2 != _co2Max) {
        _setpointsChanged = true;
      }

      _tempMin = newMin; _tempMax = newMax;
      _humMin = newHMin; _humMax = newHMax;
      _co2Max = newCO2;
      _hasSetpoints = true;
    } else {
      _hasSetpoints = false;
    }
  } else {
    _hasActiveCycle = false;
    _hasSetpoints = false;
    _phase[0] = '\0';
  }

  JsonArray actuators;
  if (doc.is<JsonArray>()) {
    actuators = doc.as<JsonArray>();
  } else {
    actuators = doc["actuators"].as<JsonArray>();
  }

  if (actuators.isNull()) {
    Serial.printf("[POLL] Respuesta sin 'actuators' ni array raíz: %s\n", body.c_str());
    failCount++;
    pollState = POLL_IDLE;
    lastPollOk = false;
    return;
  }

  applyActuators(actuators);

  _ssrActiveLowPrev = _ssrActiveLow;
  if (doc["ssrActiveLow"].is<bool>()) {
    _ssrActiveLow = doc["ssrActiveLow"].as<bool>();
  }

  pollState = POLL_IDLE;
  lastPollOk = true;
}

void HTTPPoller::applyActuators(JsonArray actuators) {
  for (JsonObject act : actuators) {
    int ch = act["channel"] | 0;
    if (ch < 1 || ch > ACTUATOR_CHANNELS) continue;
    int idx = ch - 1;
    desired[idx].state = (strcmp(act["state"] | "OFF", "ON") == 0) ? 1 : 0;
    desired[idx].mode = (strcmp(act["mode"] | "LOCAL", "REMOTE") == 0) ? 1 : 0;
  }
#if POLL_DEBUG
  Serial.printf("[POLL] Ch1:%s/%s Ch2:%s/%s Ch3:%s/%s Ch4:%s/%s\n",
    desired[0].state ? "ON" : "OFF", desired[0].mode ? "RM" : "LC",
    desired[1].state ? "ON" : "OFF", desired[1].mode ? "RM" : "LC",
    desired[2].state ? "ON" : "OFF", desired[2].mode ? "RM" : "LC",
    desired[3].state ? "ON" : "OFF", desired[3].mode ? "RM" : "LC");
#endif
}

bool HTTPPoller::getSsrActiveLow() {
  return _ssrActiveLow;
}

bool HTTPPoller::ssrActiveLowChanged() {
  return _ssrActiveLow != _ssrActiveLowPrev;
}

void HTTPPoller::getSetpoints(float* tempMin, float* tempMax, float* humMin, float* humMax, uint16_t* co2Max) {
  *tempMin = _tempMin;
  *tempMax = _tempMax;
  *humMin = _humMin;
  *humMax = _humMax;
  *co2Max = _co2Max;
}

bool HTTPPoller::setpointsChanged() {
  return _setpointsChanged;
}
