#include "device_manager.h"
#include <Preferences.h>
#include <WiFi.h>

static const char* PREFS_NS = "mush2";
static const char* DEVICE_ID_KEY = "deviceId";

DeviceManager::DeviceManager() : firstBoot(false) {
}

String DeviceManager::generateFromMAC() {
  WiFi.mode(WIFI_STA);
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char buf[13];
  snprintf(buf, sizeof(buf), "%02X%02X%02X%02X%02X%02X",
    mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String("mush2_") + String(buf);
}

bool DeviceManager::loadFromNVS() {
  Preferences prefs;
  prefs.begin(PREFS_NS, true);
  String id = prefs.getString(DEVICE_ID_KEY, "");
  prefs.end();

  if (id.length() > 0) {
    deviceId = id;
    return true;
  }
  return false;
}

void DeviceManager::saveToNVS(const String& id) {
  Preferences prefs;
  prefs.begin(PREFS_NS, false);
  prefs.putString(DEVICE_ID_KEY, id);
  prefs.end();
}

void DeviceManager::init() {
  if (loadFromNVS()) {
    firstBoot = false;
    Serial.printf("[DEVICE] ID desde NVS: %s\n", deviceId.c_str());
    return;
  }
  firstBoot = true;
  deviceId = generateFromMAC();
  saveToNVS(deviceId);
  Serial.printf("[DEVICE] Primer boot — ID generado desde MAC: %s\n", deviceId.c_str());
}

const String& DeviceManager::getDeviceId() const {
  return deviceId;
}
