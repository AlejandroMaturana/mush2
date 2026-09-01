#include "ota_handler.h"
#include "ota_nvs.h"
#include <ArduinoOTA.h>

// ISSUE-050: placeholder — nunca un secreto real en el árbol.
// La contraseña real por dispositivo llega por provisioning/registro y
// se persiste en NVS (cierre en ISSUE-059/052).
#ifndef OTA_PASSWORD
#define OTA_PASSWORD "CHANGE_ME_OTA_PASSWORD"
#endif

OTAHandler::OTAHandler() {
  deviceId[0] = '\0';
}

void OTAHandler::init(const char* id) {
  snprintf(deviceId, sizeof(deviceId), "%s", id);

  ArduinoOTA.setHostname(deviceId);

  String nvsPwd = nvsGetOtaPass();
  if (nvsPwd.length() > 0) {
    ArduinoOTA.setPassword(nvsPwd.c_str());
    Serial.println("[OTA] Password OTA desde NVS");
  } else {
    ArduinoOTA.setPassword(OTA_PASSWORD);
  }

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
