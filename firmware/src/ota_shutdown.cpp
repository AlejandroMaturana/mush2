#include "ota_shutdown.h"
#include "ssr_controller.h"

OTAShutdown::OTAShutdown() : _ssr(nullptr) {}

void OTAShutdown::init(SSRController* ssr) {
  _ssr = ssr;
}

bool OTAShutdown::begin() {
  Serial.println("[OTA] Safe shutdown: apagando actuadores...");
  if (_ssr) _ssr->setAll(0);
  return true;
}

void OTAShutdown::abortRollback() {
  Serial.println("[OTA] Abortando rollback...");
}
