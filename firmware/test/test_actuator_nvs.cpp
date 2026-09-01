#include <unity.h>

#include "actuator_nvs.h"

// Compilar el modulo de produccion en esta TU (cobertura nativa de PR-H/I105).
#include "../src/actuator_nvs.cpp"

// I105 · PR-H — actuator_nvs (persistencia de estado/hold de actuadores en NVS).

void test_ACTNVS_init_prepares_schema_and_defaults(void) {
  actuatorNVSInit();

  uint32_t hold[ACTUATOR_CHANNELS];
  actuatorNVSLoadHoldWindow(hold);
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    TEST_ASSERT_EQUAL_UINT32(ACTUATOR_HOLD_WINDOW_MS, hold[i]);
  }

  ActuatorPersistedData data;
  uint32_t ts = 0;
  TEST_ASSERT_TRUE(actuatorNVSLoad(&data, &ts));
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    TEST_ASSERT_EQUAL_UINT8(0, data.desired[i]);
    TEST_ASSERT_EQUAL_UINT8(0, data.mode[i]);
  }
  TEST_ASSERT_EQUAL_UINT32(0, ts);
}

void test_ACTNVS_load_without_data_fails(void) {
  ActuatorPersistedData data;
  uint32_t ts = 0;
  TEST_ASSERT_FALSE(actuatorNVSLoad(&data, &ts));
}

void test_ACTNVS_save_load_roundtrip(void) {
  actuatorNVSInit();

  ActuatorPersistedData data;
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    data.desired[i] = (uint8_t)(i + 1);
    data.mode[i] = (uint8_t)(i + 2);
  }
  stubs::espTimerUs() = 123456789;  // 123456 ms desde boot
  actuatorNVSSave(&data);

  ActuatorPersistedData out;
  uint32_t ts = 0;
  TEST_ASSERT_TRUE(actuatorNVSLoad(&out, &ts));
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    TEST_ASSERT_EQUAL_UINT8((uint8_t)(i + 1), out.desired[i]);
    TEST_ASSERT_EQUAL_UINT8((uint8_t)(i + 2), out.mode[i]);
  }
  TEST_ASSERT_EQUAL_UINT32(123456, ts);
}

void test_ACTNVS_init_idempotent_and_hold_roundtrip(void) {
  actuatorNVSInit();
  actuatorNVSInit();  // schema ya en 1: no re-inicializa

  uint32_t hold[ACTUATOR_CHANNELS] = {1000, 2000, 3000, 4000};
  actuatorNVSSaveHoldWindow(hold);

  uint32_t out[ACTUATOR_CHANNELS];
  actuatorNVSLoadHoldWindow(out);
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    TEST_ASSERT_EQUAL_UINT32(hold[i], out[i]);
  }
}

void test_ACTNVS_load_hold_window_defaults_when_missing(void) {
  uint32_t hold[ACTUATOR_CHANNELS] = {0, 0, 0, 0};
  actuatorNVSLoadHoldWindow(hold);  // sin init: readLen != esperado → defaults
  for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
    TEST_ASSERT_EQUAL_UINT32(ACTUATOR_HOLD_WINDOW_MS, hold[i]);
  }
}
