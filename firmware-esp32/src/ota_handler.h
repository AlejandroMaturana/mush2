#ifndef OTA_HANDLER_H
#define OTA_HANDLER_H

#include <Arduino.h>
#include <WiFi.h>
#include <Update.h>

class OTAHandler {
public:
  OTAHandler();
  void init(const char* deviceId);
  void loop();
  bool startArduinoOTA();
  bool startHTTPUpdate(const char* firmwareUrl);
  bool isUpdating();
  const char* getVersion();

private:
  bool updating;
  char deviceId[32];
  unsigned long otaActivatedAt;
  static const unsigned long OTA_TIMEOUT = 120000;
};

#endif
