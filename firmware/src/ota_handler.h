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
  const char* getVersion();

private:
  char deviceId[32];
};

#endif
