#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>

#define MAX_NETWORKS 2

struct WiFiCredential {
  String ssid;
  String password;
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
  void setProvisionedCredentials(const String& ssid, const String& password);
  bool hasProvisionedCredentials();

private:
  WiFiCredential networks[MAX_NETWORKS];
  int currentNetwork;
  unsigned long lastAttempt;
  unsigned long connectStartTime;
  bool connected;
  bool connecting;
  bool _hasProvisioned;

  bool tryConnect(int netIndex);
  void checkConnection();
};

#endif
