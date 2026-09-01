#include "device_manager.h"
#include <Preferences.h>
#include <WiFi.h>

static const char* PREFS_NS = "mush2";
static const char* DEVICE_ID_KEY = "deviceId";
static const char* MQTT_USER_KEY = "mqttUser";
static const char* MQTT_PASS_KEY = "mqttPass";

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

// ADR-028: credenciales MQTT provisionadas se persisten en NVS para
// sobrevivir reinicios y no depender de defaults compilados en config.h.
bool DeviceManager::loadMqttCredentials(String& user, String& pass) {
  Preferences prefs;
  prefs.begin(PREFS_NS, true);
  String u = prefs.getString(MQTT_USER_KEY, "");
  String p = prefs.getString(MQTT_PASS_KEY, "");
  prefs.end();

  if (u.length() > 0 && p.length() > 0) {
    user = u;
    pass = p;
    return true;
  }
  return false;
}

void DeviceManager::saveMqttCredentials(const String& user, const String& pass) {
  Preferences prefs;
  prefs.begin(PREFS_NS, false);
  prefs.putString(MQTT_USER_KEY, user);
  prefs.putString(MQTT_PASS_KEY, pass);
  prefs.end();
  Serial.printf("[DEVICE] Credenciales MQTT persistidas en NVS (user=%s)\n", user.c_str());
}
