#include <unity.h>

#include "ota_postboot_policy.h"

// PR-H · ISSUE-058 (FW-009) — decision de confirmacion post-OTA desacoplada
// de la red: reintento con WiFi estable, rollback explicito solo si el
// self-test de nucleo falla.

void test_I58_decision_none_when_not_pending(void) {
  TEST_ASSERT_EQUAL_INT((int)OtaPostBootDecision::NONE,
    (int)decidePostBoot(false, true, true));
  TEST_ASSERT_EQUAL_INT((int)OtaPostBootDecision::NONE,
    (int)decidePostBoot(false, false, false));
}

void test_I58_decision_rollback_when_core_selftest_fails(void) {
  TEST_ASSERT_EQUAL_INT((int)OtaPostBootDecision::ROLLBACK,
    (int)decidePostBoot(true, false, true));
  TEST_ASSERT_EQUAL_INT((int)OtaPostBootDecision::ROLLBACK,
    (int)decidePostBoot(true, false, false));
}

void test_I58_decision_wait_retry_when_no_network(void) {
  TEST_ASSERT_EQUAL_INT((int)OtaPostBootDecision::WAIT_RETRY,
    (int)decidePostBoot(true, true, false));
}

void test_I58_decision_confirm_when_core_ok_and_network_stable(void) {
  TEST_ASSERT_EQUAL_INT((int)OtaPostBootDecision::CONFIRM,
    (int)decidePostBoot(true, true, true));
}
