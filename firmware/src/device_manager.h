#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>

class DeviceManager {
public:
  DeviceManager();
  void init();
  const String& getDeviceId() const;

private:
  String deviceId;
  bool firstBoot;

  static const int EEPROM_MAGIC_ADDR = 16;
  static const int EEPROM_DEVICEID_ADDR = 18;
  static const int EEPROM_DEVICEID_MAX = 24;
  static const uint16_t MAGIC = 0xD1D0;

  bool loadFromEEPROM();
  void saveToEEPROM(const String& id);
  String generateFromMAC();
};

#endif
