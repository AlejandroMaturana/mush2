#include "ota_handler.h"
#include <ArduinoOTA.h>

OTAHandler::OTAHandler() : updating(false), lastCheck(0) {
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
  }
}

bool OTAHandler::startArduinoOTA() {
  updating = true;
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

  WiFiClient client;
  t_httpUpdate_return ret = ESPhttpUpdate.update(client, firmwareUrl, "0.8.0");

  switch (ret) {
    case HTTP_UPDATE_FAILED:
      Serial.printf("[OTA] Error HTTP: %d (%s)\n",
        ESPhttpUpdate.getLastError(),
        ESPhttpUpdate.getLastErrorString().c_str());
      updating = false;
      return false;

    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("[OTA] Sin actualizaciones disponibles");
      updating = false;
      return false;

    case HTTP_UPDATE_OK:
      Serial.println("[OTA] Actualización OK — reiniciando...");
      return true;
  }

  return false;
}

bool OTAHandler::isUpdating() {
  return updating;
}

const char* OTAHandler::getVersion() {
  return "0.8.0";
}
