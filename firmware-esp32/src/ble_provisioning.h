#ifndef BLE_PROVISIONING_H
#define BLE_PROVISIONING_H

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLECharacteristic.h>
#include <BLEAdvertising.h>
#include <BLE2902.h>

#define PROV_SERVICE_UUID        "a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d"
#define PROV_CHAR_DEVICE_INFO    "a7c3d6e1-f1b2-4a5b-8c9d-0e1f2a3b4c5d"
#define PROV_CHAR_WIFI_SSID     "a7c3d6e2-f1b2-4a5b-8c9d-0e1f2a3b4c5d"
#define PROV_CHAR_WIFI_PASS     "a7c3d6e3-f1b2-4a5b-8c9d-0e1f2a3b4c5d"
#define PROV_CHAR_CMD           "a7c3d6e4-f1b2-4a5b-8c9d-0e1f2a3b4c5d"
#define PROV_CHAR_STATUS        "a7c3d6e5-f1b2-4a5b-8c9d-0e1f2a3b4c5d"

#ifndef BLE_DEVICE_NAME_PREFIX
#define BLE_DEVICE_NAME_PREFIX "Mush2"
#endif

class BLEProvisioning {
public:
  BLEProvisioning();
  void init(const char* deviceId, const char* fwVer);
  void start();
  void stop();
  void loop();
  bool isActive();
  bool isProvisioned();
  const char* getStoredSSID();
  void getStoredCredentials(String& ssid, String& password);
  void clearCredentials();
  void setBackendConfig(const char* host, uint16_t port);
  const char* getBackendHost();
  uint16_t getBackendPort();

  // Exposed for ProvCmdCallback friend
  BLECharacteristic* charWifiSsid() { return _charWifiSsid; }
  BLECharacteristic* charWifiPass() { return _charWifiPass; }
  BLECharacteristic* charStatus() { return _charStatus; }
  void saveCredentials(const String& ssid, const String& pass) { _saveCredentials(ssid, pass); }
  void publishStatus(const char* status, const char* msg) { _publishStatus(status, msg); }
  void clearNVS() { _clearNVS(); }
  void scheduleRestart(unsigned long delayMs);

private:
  bool _active;
  bool _provisioned;
  bool _restartPending;
  unsigned long _restartAt;
  BLEServer* _server;
  BLEService* _service;
  BLECharacteristic* _charDeviceInfo;
  BLECharacteristic* _charWifiSsid;
  BLECharacteristic* _charWifiPass;
  BLECharacteristic* _charCmd;
  BLECharacteristic* _charStatus;

  String _deviceId;
  String _bleName;
  String _fwVer;
  String _storedSsid;
  String _storedPassword;
  String _backendHost;
  uint16_t _backendPort;

  void _createServer();
  void _loadCredentials();
  void _saveCredentials(const String& ssid, const String& password);
  void _setProvisioned(bool provisioned);
  void _clearNVS();
  void _publishStatus(const char* status, const char* msg);
};

#endif
