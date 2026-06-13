#include "wifi_manager.h"
#include "config.h"
#include <ESP8266WiFi.h>

WiFiManager::WiFiManager() {
  networks[0].ssid = WIFI_SSID_1;
  networks[0].password = WIFI_PASSWORD_1;
  networks[1].ssid = WIFI_SSID_2;
  networks[1].password = WIFI_PASSWORD_2;
  currentNetwork = 0;
  lastAttempt = 0;
  connected = false;
  connecting = false;
}

void WiFiManager::init() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
}

bool WiFiManager::connect() {
  WiFi.disconnect();
  delay(100);
  return tryConnect(currentNetwork);
}

bool WiFiManager::tryConnect(int netIndex) {
  if (netIndex < 0 || netIndex > 1) return false;
  connecting = true;
  Serial.printf("[WiFi] Conectando a %s...\n", networks[netIndex].ssid);
  WiFi.begin(networks[netIndex].ssid, networks[netIndex].password);

  int attempts = 0;
  while (attempts < 40) {
    delay(500);
    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      connecting = false;
      Serial.printf("[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
      return true;
    }
    attempts++;
  }

  connected = false;
  connecting = false;
  Serial.printf("[WiFi] Falló conexión a %s\n", networks[netIndex].ssid);
  return false;
}

void WiFiManager::loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!connected) {
      connected = true;
      Serial.printf("[WiFi] Reconectado! IP: %s\n", WiFi.localIP().toString().c_str());
    }
    return;
  }

  connected = false;

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
