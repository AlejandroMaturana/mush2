#include "wifi_manager.h"
#include "config.h"
#include <WiFi.h>

#define CONNECT_TIMEOUT 20000

WiFiManager::WiFiManager() {
  networks[0].ssid = WIFI_SSID_1;
  networks[0].password = WIFI_PASSWORD_1;
  networks[1].ssid = WIFI_SSID_2;
  networks[1].password = WIFI_PASSWORD_2;
  currentNetwork = 0;
  lastAttempt = 0;
  connectStartTime = 0;
  connected = false;
  connecting = false;
}

void WiFiManager::init() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
}

bool WiFiManager::connect() {
  WiFi.disconnect();
  connecting = false;
  return tryConnect(currentNetwork);
}

bool WiFiManager::tryConnect(int netIndex) {
  if (netIndex < 0 || netIndex > 1) return false;

  if (strcmp(networks[netIndex].ssid, "your_ssid_1") == 0 ||
      strcmp(networks[netIndex].ssid, "your_ssid_2") == 0) {
    Serial.printf("[WiFi] SSID placeholder '%s' — configure WIFI_SSID en config.h\n",
      networks[netIndex].ssid);
    return false;
  }

  connecting = true;
  connectStartTime = millis();
  Serial.printf("[WiFi] Conectando a %s...\n", networks[netIndex].ssid);
  WiFi.begin(networks[netIndex].ssid, networks[netIndex].password);

  return true;
}

void WiFiManager::checkConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!connected) {
      connected = true;
      connecting = false;
      Serial.printf("[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
    }
    return;
  }

  if (connecting) {
    if (millis() - connectStartTime >= CONNECT_TIMEOUT) {
      connecting = false;
      connected = false;
      Serial.printf("[WiFi] Timeout conectando a %s\n", networks[currentNetwork].ssid);
    }
    return;
  }

  if (connected) {
    connected = false;
    Serial.println("[WiFi] Conexión perdida");
  }
}

void WiFiManager::loop() {
  checkConnection();

  if (connected) return;
  if (connecting) return;

  unsigned long now = millis();
  if (now - lastAttempt < 5000) return;
  lastAttempt = now;

  currentNetwork = (currentNetwork + 1) % 2;
  tryConnect(currentNetwork);
}

bool WiFiManager::isConnected() {
  return connected && WiFi.status() == WL_CONNECTED;
}

int8_t WiFiManager::getRSSI() {
  return WiFi.RSSI();
}

String WiFiManager::getMacAddress() {
  return WiFi.macAddress();
}
