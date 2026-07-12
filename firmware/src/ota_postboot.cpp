#include "ota_postboot.h"
#include "state_machine.h"
#include "config.h"
#include "ota_nvs.h"
#include <WiFi.h>
#include <Wire.h>

OTAConfirmation::OTAConfirmation() : _otaPending(false), _sm(nullptr) {}

void OTAConfirmation::init(StateMachine* sm) {
  _sm = sm;
}

bool OTAConfirmation::isPendingVerification() {
  const esp_partition_t* running = esp_ota_get_running_partition();
  if (!running) return false;

  esp_ota_img_states_t ota_state;
  if (esp_ota_get_state_partition(running, &ota_state) != ESP_OK) return false;

  return ota_state == ESP_OTA_IMG_PENDING_VERIFY;
}

bool OTAConfirmation::selfTest() {
  if (!isPendingVerification()) return false;

  _otaPending = true;
  Serial.println("[OTA] Post-boot: particion en PENDING_VERIFY, ejecutando self-test...");

  bool sensorsOk = true;
  bool wifiOk = WiFi.status() == WL_CONNECTED;
  bool stateOk = _sm && _sm->getState() == ST_NORMAL;

  bool i2cOk = false;
  Wire.beginTransmission(0x38);
  i2cOk = (Wire.endTransmission() == 0);

  uint32_t freeHeap = ESP.getFreeHeap();
  bool heapOk = (freeHeap > 30000);

  Serial.printf("[OTA] Self-test: WiFi=%s, State=%s, I2C=%s, Heap=%lu (%s)\n",
    wifiOk ? "OK" : "FAIL",
    _sm ? _sm->getStateName() : "?",
    i2cOk ? "OK" : "FAIL",
    freeHeap,
    heapOk ? "OK" : "LOW");

  return wifiOk && stateOk && i2cOk && heapOk;
}

void OTAConfirmation::confirm() {
  if (!_otaPending) return;
  _otaPending = false;

  esp_err_t err = esp_ota_mark_app_valid_cancel_rollback();
  if (err == ESP_OK) {
    Serial.println("[OTA] Firmware marcado como VALID — rollback cancelado");
  } else {
    Serial.printf("[OTA] Error marcando firmare como valid: %s\n", esp_err_to_name(err));
  }
}

void OTAConfirmation::rollback() {
  if (!_otaPending) return;
  _otaPending = false;

  Serial.println("[OTA] Self-test fallo — solicitando rollback...");
  esp_ota_mark_app_invalid_rollback_and_reboot();
}
