#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>

class DeviceManager {
public:
  DeviceManager();
  void init();
  const String& getDeviceId() const;

  // ADR-028: credenciales MQTT provisionadas se persisten en NVS.
  bool loadMqttCredentials(String& user, String& pass);
  void saveMqttCredentials(const String& user, const String& pass);

private:
  String deviceId;
  bool firstBoot;

  bool loadFromNVS();
  void saveToNVS(const String& id);
  String generateFromMAC();
};

#endif
