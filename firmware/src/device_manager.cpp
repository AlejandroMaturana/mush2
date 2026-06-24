#include "device_manager.h"
#include <EEPROM.h>
#include <ESP8266WiFi.h>

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

bool DeviceManager::loadFromEEPROM() {
  uint16_t magic;
  EEPROM.get(EEPROM_MAGIC_ADDR, magic);
  if (magic != MAGIC) return false;
  char buf[EEPROM_DEVICEID_MAX + 1] = {0};
  for (int i = 0; i < EEPROM_DEVICEID_MAX; i++) {
    buf[i] = EEPROM.read(EEPROM_DEVICEID_ADDR + i);
    if (buf[i] == '\0') break;
  }
  deviceId = String(buf);
  return deviceId.length() > 0;
}

void DeviceManager::saveToEEPROM(const String& id) {
  EEPROM.put(EEPROM_MAGIC_ADDR, MAGIC);
  int len = min((int)id.length(), EEPROM_DEVICEID_MAX);
  for (int i = 0; i < len; i++) {
    EEPROM.write(EEPROM_DEVICEID_ADDR + i, id[i]);
  }
  EEPROM.write(EEPROM_DEVICEID_ADDR + len, '\0');
  EEPROM.commit();
}

void DeviceManager::init() {
  if (loadFromEEPROM()) {
    firstBoot = false;
    Serial.printf("[DEVICE] ID desde EEPROM: %s\n", deviceId.c_str());
    return;
  }
  firstBoot = true;
  deviceId = generateFromMAC();
  saveToEEPROM(deviceId);
  Serial.printf("[DEVICE] Primer boot — ID generado desde MAC: %s\n", deviceId.c_str());
}

const String& DeviceManager::getDeviceId() const {
  return deviceId;
}
