#include <unity.h>

#include <Preferences.h>
#include "state_machine.h"

// Compilar el modulo de produccion en esta TU (cobertura nativa de PR-H).
#include "../src/state_machine.cpp"

// PR-H · ISSUE-053 (FW-004) — rebootCount se resetea al llegar a ST_NORMAL
// y los boots post-OTA no cuentan como anormales.

void test_I53_reboot_count_resets_on_normal(void) {
  Preferences prefs;
  prefs.begin("mush2", false);
  prefs.putUChar("rebootCnt", 4);
  prefs.putUChar("fsmState", (uint8_t)ST_INIT);
  prefs.end();

  StateMachine sm;
  sm.init();
  TEST_ASSERT_EQUAL_UINT8(4, sm.getRebootCount());

  TEST_ASSERT_TRUE(sm.fsmTransition(ST_WIFI, "test"));
  TEST_ASSERT_TRUE(sm.fsmTransition(ST_NORMAL, "test"));
  TEST_ASSERT_EQUAL_UINT8(0, sm.getRebootCount());

  prefs.begin("mush2", true);
  TEST_ASSERT_EQUAL_UINT8(0, prefs.getUChar("rebootCnt", 255));
  prefs.end();
}

void test_I53_post_ota_boot_not_counted_as_abnormal(void) {
  Preferences prefs;
  prefs.begin("mush2", false);
  prefs.putUChar("rebootCnt", 3);
  prefs.putUChar("fsmState", (uint8_t)ST_OTA_UPDATING);
  prefs.end();

  StateMachine sm;
  sm.init();
  TEST_ASSERT_EQUAL_UINT8(3, sm.getRebootCount());
}

void test_I53_error_boot_still_counted_as_abnormal(void) {
  Preferences prefs;
  prefs.begin("mush2", false);
  prefs.putUChar("rebootCnt", 3);
  prefs.putUChar("fsmState", (uint8_t)ST_ERROR);
  prefs.end();

  StateMachine sm;
  sm.init();
  TEST_ASSERT_EQUAL_UINT8(4, sm.getRebootCount());
}

// PR-H · ISSUE-054 (FW-005) — gate de actuacion por estado:
// SSR off en SAFE y OTA_UPDATING.

void test_I54_blocks_actuation_in_safe_and_ota(void) {
  StateMachine sm;
  sm.init();
  TEST_ASSERT_FALSE(sm.blocksActuation());

  TEST_ASSERT_TRUE(sm.fsmTransition(ST_WIFI, "test"));
  TEST_ASSERT_TRUE(sm.fsmTransition(ST_NORMAL, "test"));
  TEST_ASSERT_FALSE(sm.blocksActuation());

  TEST_ASSERT_TRUE(sm.fsmTransition(ST_OTA_UPDATING, "test"));
  TEST_ASSERT_TRUE(sm.blocksActuation());
}

void test_I54_blocks_actuation_in_safe(void) {
  StateMachine sm;
  sm.init();
  TEST_ASSERT_TRUE(sm.fsmTransition(ST_SAFE, "test"));
  TEST_ASSERT_TRUE(sm.blocksActuation());
}
