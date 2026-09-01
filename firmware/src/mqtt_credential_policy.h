#ifndef MQTT_CREDENTIAL_POLICY_H
#define MQTT_CREDENTIAL_POLICY_H

// ISSUE-059 (FW-010) / ADR-028 — Política de credenciales MQTT del firmware.
//
// Decisión de a qué fuente recurrir para el cliente MQTT tras el boot:
//   PROVISIONED      → credenciales de NVS (o recién entregadas por el registro).
//   DEFAULT_FALLBACK → credenciales por defecto de config.h, SOLO primer arranque.
//   NO_CREDENTIALS   → sin identidad compartida (no primer arranque, sin NVS).
//
// Regla "fallback solo primer arranque": el modo DEFAULT_FALLBACK es alcanzable
// únicamente cuando no hay credenciales provisionadas Y el dispositivo está en su
// primer arranque. En arranques posteriores sin credenciales, el firmware NO usa
// la identidad compartida por defecto (el broker exige identidad por dispositivo).

enum class MqttCredentialMode {
  PROVISIONED,
  DEFAULT_FALLBACK,
  NO_CREDENTIALS
};

// hasProvisioned: true si existen credenciales en NVS o acaban de llegar del
//   registro HTTP (POST /api/v1/devices/register).
// isFirstBoot:    true solo en el primer arranque (deviceId generado en este boot).
inline MqttCredentialMode resolveMqttCredentialMode(bool hasProvisioned, bool isFirstBoot) {
  if (hasProvisioned) return MqttCredentialMode::PROVISIONED;
  if (isFirstBoot) return MqttCredentialMode::DEFAULT_FALLBACK;
  return MqttCredentialMode::NO_CREDENTIALS;
}

// Guard: el fallback a credenciales por defecto SOLO es válido en el modo
// DEFAULT_FALLBACK (primer arranque). Cualquier otro modo prohíbe usarlo.
inline bool defaultFallbackAllowed(MqttCredentialMode mode) {
  return mode == MqttCredentialMode::DEFAULT_FALLBACK;
}

#endif
