#ifndef OTA_POSTBOOT_POLICY_H
#define OTA_POSTBOOT_POLICY_H

// ISSUE-058 (FW-009): política de decisión de confirmación post-OTA,
// desacoplada de la red. Pura y testeable en host (sin dependencias de
// esp_ota_ops). El self-test de núcleo manda: si falla → rollback explícito;
// si la red aún no es estable → WAIT_RETRY (reintento en runtime).

enum class OtaPostBootDecision { NONE, CONFIRM, WAIT_RETRY, ROLLBACK };

inline OtaPostBootDecision decidePostBoot(bool pendingVerify, bool coreSelfTestOk, bool networkStable) {
  if (!pendingVerify) return OtaPostBootDecision::NONE;
  if (!coreSelfTestOk) return OtaPostBootDecision::ROLLBACK;
  if (!networkStable) return OtaPostBootDecision::WAIT_RETRY;
  return OtaPostBootDecision::CONFIRM;
}

#endif // OTA_POSTBOOT_POLICY_H
