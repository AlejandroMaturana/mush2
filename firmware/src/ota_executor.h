#ifndef OTA_EXECUTOR_H
#define OTA_EXECUTOR_H

#include <Arduino.h>
#include <WiFi.h>
#include <Update.h>

class OTAExecutor {
public:
  OTAExecutor();
  bool begin(const String& url, const String& expectedHash = "");
  void setCaCert(const char* cert);
  bool verifyLastHash();
private:
  bool _lastHashValid;
};

#endif
