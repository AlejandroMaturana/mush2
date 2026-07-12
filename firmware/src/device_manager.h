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

  bool loadFromNVS();
  void saveToNVS(const String& id);
  String generateFromMAC();
};

#endif
