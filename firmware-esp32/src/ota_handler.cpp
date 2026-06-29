#include "ota_handler.h"
#include <ArduinoOTA.h>
#include <HTTPClient.h>

OTAHandler::OTAHandler() : updating(false), otaActivatedAt(0) {
  deviceId[0] = '\0';
}

void OTAHandler::init(const char* id) {
  snprintf(deviceId, sizeof(deviceId), "%s", id);

  ArduinoOTA.setHostname(deviceId);
  ArduinoOTA.setPassword("mush2ota");

  ArduinoOTA.onStart([]() {
    Serial.println("[OTA] Iniciando actualización...");
  });

  ArduinoOTA.onEnd([]() {
    Serial.println("[OTA] Actualización completada");
  });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progreso: %u%%\r", (progress * 100) / total);
  });

  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error: %u\n", error);
  });

  ArduinoOTA.begin();
  Serial.println("[OTA] ArduinoOTA listo");
}

void OTAHandler::loop() {
  if (!updating) {
    ArduinoOTA.handle();
    return;
  }

  if (millis() - otaActivatedAt >= OTA_TIMEOUT) {
    updating = false;
    Serial.println("[OTA] Ventana OTA expirada (120s)");
  }
}

bool OTAHandler::startArduinoOTA() {
  updating = true;
  otaActivatedAt = millis();
  Serial.println("[OTA] Modo OTA activado por 120s");
  return true;
}

bool OTAHandler::startHTTPUpdate(const char* firmwareUrl) {
  if (!firmwareUrl || strlen(firmwareUrl) == 0) {
    Serial.println("[OTA] URL de firmware vacía");
    return false;
  }

  updating = true;
  Serial.printf("[OTA] Descargando firmware: %s\n", firmwareUrl);

  HTTPClient http;
  http.begin(firmwareUrl);
  http.setTimeout(30000);
  http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[OTA] Error HTTP %d\n", code);
    http.end();
    updating = false;
    return false;
  }

  int totalLen = http.getSize();
  if (totalLen <= 0) {
    Serial.println("[OTA] Tamaño de firmware inválido");
    http.end();
    updating = false;
    return false;
  }

  if (!Update.begin(totalLen, U_FLASH)) {
    Serial.printf("[OTA] Update.begin falló: %s\n", Update.errorString());
    http.end();
    updating = false;
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  size_t written = 0;
  uint8_t buffer[256];

  while (http.connected() && written < totalLen) {
    size_t available = stream->available();
    if (available) {
      size_t toRead = min(available, sizeof(buffer));
      size_t read = stream->readBytes(buffer, toRead);
      size_t flushed = Update.write(buffer, read);
      if (flushed != read) {
        Serial.printf("[OTA] Error escribiendo firmware: %s\n", Update.errorString());
        http.end();
        updating = false;
        return false;
      }
      written += flushed;
    }
    delay(1);
  }

  http.end();

  if (written != totalLen) {
    Serial.printf("[OTA] Escritos %u de %d bytes\n", written, totalLen);
    Update.abort();
    updating = false;
    return false;
  }

  if (!Update.end()) {
    Serial.printf("[OTA] Update.end falló: %s\n", Update.errorString());
    updating = false;
    return false;
  }

  Serial.println("[OTA] Actualización OK — reiniciando...");
  return true;
}

bool OTAHandler::isUpdating() {
  return updating;
}

const char* OTAHandler::getVersion() {
  return "0.8.0";
}
