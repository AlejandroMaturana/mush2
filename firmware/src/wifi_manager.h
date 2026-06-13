#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>

struct WiFiCredential {
  const char* ssid;
  const char* password;
};

class WiFiManager {
public:
  WiFiManager();
  void init();
  bool connect();
  void loop();
  bool isConnected();
  int8_t getRSSI();
  String getMacAddress();

private:
  WiFiCredential networks[2];
  int currentNetwork;
  unsigned long lastAttempt;
  bool connected;
  bool connecting;

  bool tryConnect(int netIndex);
};

#endif
