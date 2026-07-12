#ifndef OTA_NVS_H
#define OTA_NVS_H

#include <Arduino.h>

#define NVS_NAMESPACE "ota_mush2"
#define NVS_KEY_SCHEMA "schema"
#define NVS_KEY_FW_VER "fw_ver"
#define NVS_SCHEMA_VER 1

void nvsInit();
String nvsGetFwVer();
void nvsSetFwVer(const String& ver);

#endif
