#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>

class DeviceManager {
public:
  DeviceManager();
  void init();
  const String& getDeviceId() const;

  // ISSUE-059 (FW-010): true solo en el primer arranque (deviceId generado en
  // este boot y persistido en NVS). Habilita el "fallback solo primer arranque".
  bool isFirstBoot() const { return firstBoot; }

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
