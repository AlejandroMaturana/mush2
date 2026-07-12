#include "ble_provisioning.h"
#include "config.h"
#include <Preferences.h>

static const char* NVS_NS = "mush2_prov";
static const char* KEY_SSID = "ssid";
static const char* KEY_PASS = "password";
static const char* KEY_PROV = "provisioned";

static BLEProvisioning* _instance = nullptr;

// Forward: static callbacks need instance pointer
class ProvServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* srv) {
    Serial.println("[BLE] Cliente conectado");
    srv->getAdvertising()->stop();
  }

  void onDisconnect(BLEServer* srv) {
    Serial.println("[BLE] Cliente desconectado — reanudando advertising");
    srv->startAdvertising();
  }
};

class SsrModeCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* chr) {
    std::string val = chr->getValue();
    String value = String(val.c_str());
    value.trim();
    Serial.printf("[BLE] SSR mode escrito: '%s'\n", value.c_str());

    if (value == "0" || value == "1") {
      Preferences prefs;
      prefs.begin("mush2", false);
      prefs.putBool("ssr_mode", value == "1");
      prefs.end();
      Serial.printf("[BLE] SSR mode guardado en NVS: active-%s\n", value == "1" ? "LOW" : "HIGH");
    } else {
      Serial.printf("[BLE] Valor SSR mode inválido: '%s' — se ignora\n", value.c_str());
    }
  }
  void onRead(BLECharacteristic* chr) {
    Preferences prefs;
    prefs.begin("mush2", true);
    bool mode = prefs.getBool("ssr_mode", true);
    prefs.end();
    chr->setValue(mode ? "1" : "0");
    Serial.printf("[BLE] SSR mode leído de NVS: active-%s\n", mode ? "LOW" : "HIGH");
  }
};

class ProvCmdCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* chr) {
    std::string val = chr->getValue();
    String value = String(val.c_str());
    value.trim();
    Serial.printf("[BLE] Comando recibido: '%s'\n", value.c_str());

    if (!_instance) return;

    if (value == "provision") {
      std::string rawSsid = _instance->charWifiSsid()->getValue();
      std::string rawPass = _instance->charWifiPass()->getValue();
      String ssid = String(rawSsid.c_str());
      String pass = String(rawPass.c_str());
      ssid.trim();
      pass.trim();

      if (ssid.length() == 0) {
        _instance->publishStatus("error", "SSID vacío");
        return;
      }

      _instance->saveCredentials(ssid, pass);
      _instance->publishStatus("ok", "Credenciales guardadas. Reiniciando...");
      Serial.println("[PROV] Provisioning exitoso — reiniciando en breve");
      _instance->scheduleRestart(3000);

    } else if (value == "reset") {
      _instance->publishStatus("ok", "Reiniciando dispositivo");
      Serial.println("[BLE] Comando reset");
      _instance->scheduleRestart(2000);

    } else if (value == "factory_reset") {
      _instance->clearNVS();
      _instance->publishStatus("ok", "Factory reset completado. Reiniciando...");
      Serial.println("[BLE] Factory reset — reiniciando");
      _instance->scheduleRestart(2000);

    } else {
      _instance->publishStatus("error", "Comando desconocido");
    }
  }
};

BLEProvisioning::BLEProvisioning()
  : _active(false), _provisioned(false), _restartPending(false), _restartAt(0),
    _server(nullptr), _service(nullptr),
    _charDeviceInfo(nullptr), _charWifiSsid(nullptr), _charWifiPass(nullptr),
    _charCmd(nullptr), _charStatus(nullptr), _charSsrMode(nullptr), _backendPort(0) {
  _instance = this;
}

void BLEProvisioning::init(const char* deviceId, const char* fwVer) {
  _deviceId = String(deviceId);
  _fwVer = String(fwVer);
  _loadCredentials();

  // Advertising name: "Mush2-XXXX" (últimos 4 chars del deviceId)
  String suffix = _deviceId.substring(_deviceId.length() > 4 ? _deviceId.length() - 4 : 0);
  _bleName = String(BLE_DEVICE_NAME_PREFIX) + "-" + suffix;

  Serial.printf("[PROV] DeviceID: %s, BLE name: %s, provisionado: %s\n",
    _deviceId.c_str(), _bleName.c_str(), _provisioned ? "SI" : "NO");
}

void BLEProvisioning::start() {
  if (_active) return;

  BLEDevice::init(_bleName.c_str());

  _createServer();

  _service = _server->createService(PROV_SERVICE_UUID);

  _charDeviceInfo = _service->createCharacteristic(
    PROV_CHAR_DEVICE_INFO,
    BLECharacteristic::PROPERTY_READ
  );
  String infoJson = "{\"deviceId\":\"" + _deviceId
    + "\",\"fwVer\":\"" + _fwVer
    + "\",\"hwRev\":\"" HW_REVISION "\"}";
  _charDeviceInfo->setValue(infoJson.c_str());

  _charWifiSsid = _service->createCharacteristic(
    PROV_CHAR_WIFI_SSID,
    BLECharacteristic::PROPERTY_WRITE
  );

  _charWifiPass = _service->createCharacteristic(
    PROV_CHAR_WIFI_PASS,
    BLECharacteristic::PROPERTY_WRITE
  );

  _charCmd = _service->createCharacteristic(
    PROV_CHAR_CMD,
    BLECharacteristic::PROPERTY_WRITE
  );
  _charCmd->setCallbacks(new ProvCmdCallback());

  _charStatus = _service->createCharacteristic(
    PROV_CHAR_STATUS,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  _charStatus->addDescriptor(new BLE2902());
  _charStatus->setValue("{\"status\":\"ready\"}");

  _charSsrMode = _service->createCharacteristic(
    PROV_CHAR_SSR_MODE,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  {
    Preferences prefs;
    prefs.begin("mush2", true);
    bool mode = prefs.getBool("ssr_mode", true);
    prefs.end();
    _charSsrMode->setValue(mode ? "1" : "0");
  }
  _charSsrMode->setCallbacks(new SsrModeCallback());

  _service->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(PROV_SERVICE_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  adv->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  _active = true;
  _publishStatus("ready", "Esperando configuración...");
  Serial.printf("[BLE] Advertising como '%s'\n", _bleName.c_str());
}

void BLEProvisioning::stop() {
  if (!_active) return;

  BLEDevice::deinit(false);
  _active = false;
  _server = nullptr;
  _service = nullptr;

  Serial.println("[BLE] Servicio BLE detenido");
}

bool BLEProvisioning::isActive() {
  return _active;
}

bool BLEProvisioning::isProvisioned() {
  return _provisioned;
}

const char* BLEProvisioning::getStoredSSID() {
  return _storedSsid.c_str();
}

void BLEProvisioning::getStoredCredentials(String& ssid, String& password) {
  ssid = _storedSsid;
  password = _storedPassword;
}

void BLEProvisioning::clearCredentials() {
  _clearNVS();
  _provisioned = false;
  _storedSsid = "";
  _storedPassword = "";
}

void BLEProvisioning::setBackendConfig(const char* host, uint16_t port) {
  _backendHost = String(host);
  _backendPort = port;
}

const char* BLEProvisioning::getBackendHost() {
  return _backendHost.c_str();
}

uint16_t BLEProvisioning::getBackendPort() {
  return _backendPort;
}

void BLEProvisioning::_createServer() {
  _server = BLEDevice::createServer();
  _server->setCallbacks(new ProvServerCallbacks());
}

void BLEProvisioning::_loadCredentials() {
  Preferences prefs;
  prefs.begin(NVS_NS, true);
  _provisioned = prefs.getBool(KEY_PROV, false);
  if (_provisioned) {
    _storedSsid = prefs.getString(KEY_SSID, "");
    _storedPassword = prefs.getString(KEY_PASS, "");
  }
  prefs.end();
}

void BLEProvisioning::_saveCredentials(const String& ssid, const String& password) {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  prefs.putString(KEY_SSID, ssid);
  prefs.putString(KEY_PASS, password);
  prefs.putBool(KEY_PROV, true);
  prefs.end();

  _storedSsid = ssid;
  _storedPassword = password;
  _provisioned = true;

  Serial.printf("[PROV] Credenciales guardadas en NVS: SSID=%s\n", ssid.c_str());
}

void BLEProvisioning::_setProvisioned(bool provisioned) {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  prefs.putBool(KEY_PROV, provisioned);
  prefs.end();
  _provisioned = provisioned;
}

void BLEProvisioning::_clearNVS() {
  Preferences prefs;
  prefs.begin(NVS_NS, false);
  prefs.clear();
  prefs.end();

  _provisioned = false;
  _storedSsid = "";
  _storedPassword = "";

  Serial.println("[PROV] NVS de provisioning limpiado");
}

void BLEProvisioning::scheduleRestart(unsigned long delayMs) {
  _restartPending = true;
  _restartAt = millis() + delayMs;
}

void BLEProvisioning::loop() {
  if (_restartPending && millis() >= _restartAt) {
    Serial.println("[BLE] Reinicio programado — ejecutando ESP.restart()");
    ESP.restart();
  }
}

void BLEProvisioning::_publishStatus(const char* status, const char* msg) {
  String json = "{\"status\":\"";
  json += status;
  json += "\",\"msg\":\"";
  json += msg;
  json += "\"}";
  _charStatus->setValue(json.c_str());
  _charStatus->notify();
  Serial.printf("[PROV] Status: %s — %s\n", status, msg);
}
