#include <unity.h>

#include "ota_decisor.h"

// Compilar el modulo de produccion en esta TU (cobertura nativa de PR-H/I105).
#include "../src/ota_decisor.cpp"

// I105 · PR-H — OTASelector (ota_decisor.cpp): validacion de URL, semver y RSSI.

void test_OSEL_validate_url_rejects_empty(void) {
  OTASelector sel;
  TEST_ASSERT_FALSE(sel.validateUrl(String("")));
}

void test_OSEL_validate_url_rejects_http_scheme(void) {
  OTASelector sel;
  TEST_ASSERT_FALSE(sel.validateUrl(String("http://host/fw.bin")));
}

void test_OSEL_validate_url_rejects_missing_bin_extension(void) {
  OTASelector sel;
  TEST_ASSERT_FALSE(sel.validateUrl(String("https://host/fw.bin?v=1")));
  TEST_ASSERT_FALSE(sel.validateUrl(String("https://host/fw")));
}

void test_OSEL_validate_url_accepts_https_bin(void) {
  OTASelector sel;
  TEST_ASSERT_TRUE(sel.validateUrl(String("https://host/fw.bin")));
}

void test_OSEL_compare_semver_equal(void) {
  OTASelector sel;
  TEST_ASSERT_EQUAL_INT(0, sel.compareSemVer(String("0.23.4"), String("0.23.4")));
}

void test_OSEL_compare_semver_candidate_major_newer(void) {
  OTASelector sel;
  TEST_ASSERT_EQUAL_INT(1, sel.compareSemVer(String("0.23.4"), String("1.0.0")));
}

void test_OSEL_compare_semver_candidate_major_older(void) {
  OTASelector sel;
  TEST_ASSERT_EQUAL_INT(-1, sel.compareSemVer(String("1.0.0"), String("0.23.4")));
}

void test_OSEL_compare_semver_minor_and_patch(void) {
  OTASelector sel;
  TEST_ASSERT_EQUAL_INT(1, sel.compareSemVer(String("0.23.4"), String("0.24.0")));
  TEST_ASSERT_EQUAL_INT(1, sel.compareSemVer(String("0.23.4"), String("0.23.5")));
  TEST_ASSERT_EQUAL_INT(-1, sel.compareSemVer(String("0.23.4"), String("0.23.3")));
}

void test_OSEL_rssi_threshold(void) {
  OTASelector sel;
  TEST_ASSERT_TRUE(sel.checkRssiThreshold(-60));
  TEST_ASSERT_TRUE(sel.checkRssiThreshold(-75));
  TEST_ASSERT_FALSE(sel.checkRssiThreshold(-76));
  TEST_ASSERT_FALSE(sel.checkRssiThreshold(-90));
}

void test_OSEL_select_valid_when_url_and_rssi_ok(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("https://host/fw.bin"), String("0.24.0"), -60);
  TEST_ASSERT_TRUE(cand.valid);
  TEST_ASSERT_EQUAL_STRING("https://host/fw.bin", cand.url.c_str());
  TEST_ASSERT_EQUAL_STRING("0.24.0", cand.version.c_str());
  TEST_ASSERT_EQUAL_INT(-60, cand.rssi);
}

void test_OSEL_select_invalid_when_url_bad(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("http://host/fw.bin"), String("0.24.0"), -60);
  TEST_ASSERT_FALSE(cand.valid);
}

void test_OSEL_select_invalid_when_rssi_weak(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("https://host/fw.bin"), String("0.24.0"), -90);
  TEST_ASSERT_FALSE(cand.valid);
}
