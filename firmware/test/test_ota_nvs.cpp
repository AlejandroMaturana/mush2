#include <unity.h>

#include "ota_nvs.h"

// Compilar el modulo de produccion en esta TU (cobertura nativa de PR-H/I105).
#include "../src/ota_nvs.cpp"

// I105 · PR-H — ota_nvs (firmware version + ota_pass persistidos en NVS).
// FIRMWARE_VERSION se define en platformio.test.ini ("0.23.4").

void test_OTANVS_get_fw_ver_empty_returns_default(void) {
  TEST_ASSERT_EQUAL_STRING("0.0.0", nvsGetFwVer().c_str());
}

void test_OTANVS_init_sets_schema_and_firmware_version(void) {
  nvsInit();
  TEST_ASSERT_EQUAL_STRING("0.23.4", nvsGetFwVer().c_str());
}

void test_OTANVS_set_get_fw_ver_roundtrip(void) {
  nvsSetFwVer("1.2.3");
  TEST_ASSERT_EQUAL_STRING("1.2.3", nvsGetFwVer().c_str());
}

void test_OTANVS_ota_pass_roundtrip(void) {
  nvsSetOtaPass("s3cret");
  TEST_ASSERT_EQUAL_STRING("s3cret", nvsGetOtaPass().c_str());
}

void test_OTANVS_clear_ota_pass(void) {
  nvsSetOtaPass("s3cret");
  nvsClearOtaPass();
  TEST_ASSERT_EQUAL_STRING("", nvsGetOtaPass().c_str());
}
