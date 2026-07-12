#include "ota_handler.h"
#include "ota_nvs.h"
#include <ArduinoOTA.h>

OTAHandler::OTAHandler() {
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
  ArduinoOTA.handle();
}



const char* OTAHandler::getVersion() {
  static char versionBuf[16];
  String nvsVer = nvsGetFwVer();
  if (nvsVer.length() > 0 && nvsVer != "0.0.0") {
    snprintf(versionBuf, sizeof(versionBuf), "%s", nvsVer.c_str());
  } else {
    snprintf(versionBuf, sizeof(versionBuf), "%s", FIRMWARE_VERSION);
  }
  return versionBuf;
}
