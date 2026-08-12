#include <unity.h>

#include "mqtt_credential_policy.h"

// FW-010 (ISSUE-059): con credenciales provisionadas (NVS o recién registradas),
// se usan SIEMPRE, independiente de si es primer arranque.
void test_I59_provisioned_always_wins(void) {
  TEST_ASSERT_EQUAL_INT((int)MqttCredentialMode::PROVISIONED,
    (int)resolveMqttCredentialMode(true /*hasProvisioned*/, true /*isFirstBoot*/));
  TEST_ASSERT_EQUAL_INT((int)MqttCredentialMode::PROVISIONED,
    (int)resolveMqttCredentialMode(true, false));
}

// FW-010 (ISSUE-059): el fallback a credenciales por defecto de config.h
// SOLO ocurre en el primer arranque sin credenciales.
void test_I59_default_fallback_only_first_boot(void) {
  TEST_ASSERT_EQUAL_INT((int)MqttCredentialMode::DEFAULT_FALLBACK,
    (int)resolveMqttCredentialMode(false /*hasProvisioned*/, true /*isFirstBoot*/));
}

// FW-010 (ISSUE-059): sin credenciales y NO primer arranque → nunca usar la
// identidad compartida por defecto (ADR-028): sin credenciales explícitas.
void test_I59_no_credentials_on_subsequent_boot(void) {
  TEST_ASSERT_EQUAL_INT((int)MqttCredentialMode::NO_CREDENTIALS,
    (int)resolveMqttCredentialMode(false, false));
}

// FW-010 (ISSUE-059): "fallback solo primer arranque" — el modo DEFAULT_FALLBACK
// es alcanzable en exactamente una combinación de entradas (fallback una vez).
void test_I59_fallback_reachable_exactly_once(void) {
  const bool inputs[4][2] = {
    {true, true}, {true, false}, {false, true}, {false, false}
  };
  int fallbackCount = 0;
  for (int i = 0; i < 4; i++) {
    MqttCredentialMode mode = resolveMqttCredentialMode(inputs[i][0], inputs[i][1]);
    if (defaultFallbackAllowed(mode)) fallbackCount++;
    TEST_ASSERT_FALSE(defaultFallbackAllowed(MqttCredentialMode::PROVISIONED));
    TEST_ASSERT_FALSE(defaultFallbackAllowed(MqttCredentialMode::NO_CREDENTIALS));
  }
  TEST_ASSERT_EQUAL_INT(1, fallbackCount);
}
