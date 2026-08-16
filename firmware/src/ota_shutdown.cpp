#include "ota_shutdown.h"
#include "ssr_controller.h"
#include <esp_ota_ops.h>

OTAShutdown::OTAShutdown() : _ssr(nullptr) {}

void OTAShutdown::init(SSRController* ssr) {
  _ssr = ssr;
}

bool OTAShutdown::begin() {
  Serial.println("[OTA] Safe shutdown: apagando actuadores...");
  if (_ssr) _ssr->setAll(0);
  return true;
}

// ISSUE-058 (FW-009): abortRollback real. Cancela el rollback pendiente del
// bootloader marcando la aplicacion en ejecucion como VALID, de modo que un
// fallo post-OTA (o una OTA abortada) no revierta el firmware actual.
void OTAShutdown::abortRollback() {
  esp_err_t err = esp_ota_mark_app_valid_cancel_rollback();
  if (err == ESP_OK) {
    Serial.println("[OTA] Rollback cancelado — firmware actual marcado como VALID");
  } else {
    Serial.printf("[OTA] No se pudo cancelar rollback: %s\n", esp_err_to_name(err));
  }
}
