#include "ota_nvs.h"
#include <Preferences.h>

void nvsInit() {
  Preferences prefs;
  prefs.begin(NVS_NAMESPACE, true);
  uint8_t schemaVer = prefs.getUChar(NVS_KEY_SCHEMA, 0);
  prefs.end();

  if (schemaVer < NVS_SCHEMA_VER) {
    prefs.begin(NVS_NAMESPACE, false);
    prefs.putUChar(NVS_KEY_SCHEMA, NVS_SCHEMA_VER);
    prefs.putString(NVS_KEY_FW_VER, "0.9.0");
    prefs.end();
    Serial.println("[OTA] Inicializando NVS con schema_v=1");
  }
}

String nvsGetFwVer() {
  Preferences prefs;
  prefs.begin(NVS_NAMESPACE, true);
  String ver = prefs.getString(NVS_KEY_FW_VER, "");
  prefs.end();
  if (ver.length() == 0) {
    return "0.0.0";
  }
  return ver;
}

void nvsSetFwVer(const String& ver) {
  Preferences prefs;
  prefs.begin(NVS_NAMESPACE, false);
  prefs.putString(NVS_KEY_FW_VER, ver);
  prefs.end();
  Serial.printf("[OTA] NVS fw_ver actualizado a: %s\n", ver.c_str());
}