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

// ISSUE-052 (FW-003) — hash SHA-256 obligatorio en ota/command (ADR-014 P6).
static const char* VALID_64_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

void test_OSEL_select_valid_when_url_and_rssi_ok(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("https://host/fw.bin"), String("0.24.0"), String(VALID_64_HEX), -60);
  TEST_ASSERT_TRUE(cand.valid);
  TEST_ASSERT_EQUAL_STRING("https://host/fw.bin", cand.url.c_str());
  TEST_ASSERT_EQUAL_STRING("0.24.0", cand.version.c_str());
  TEST_ASSERT_EQUAL_STRING(VALID_64_HEX, cand.hash.c_str());
  TEST_ASSERT_EQUAL_INT(-60, cand.rssi);
}

void test_OSEL_select_invalid_when_url_bad(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("http://host/fw.bin"), String("0.24.0"), String(VALID_64_HEX), -60);
  TEST_ASSERT_FALSE(cand.valid);
}

void test_OSEL_select_invalid_when_rssi_weak(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("https://host/fw.bin"), String("0.24.0"), String(VALID_64_HEX), -90);
  TEST_ASSERT_FALSE(cand.valid);
}

void test_OSEL_validate_hash_rejects_empty(void) {
  OTASelector sel;
  TEST_ASSERT_FALSE(sel.validateHash(String("")));
}

void test_OSEL_validate_hash_rejects_short(void) {
  OTASelector sel;
  TEST_ASSERT_FALSE(sel.validateHash(String("abc")));
}

void test_OSEL_validate_hash_rejects_non_hex(void) {
  OTASelector sel;
  TEST_ASSERT_FALSE(sel.validateHash(String("zz3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")));
}

void test_OSEL_validate_hash_accepts_64_hex(void) {
  OTASelector sel;
  TEST_ASSERT_TRUE(sel.validateHash(String(VALID_64_HEX)));
}

void test_OSEL_validate_hash_accepts_uppercase_hex(void) {
  OTASelector sel;
  TEST_ASSERT_TRUE(sel.validateHash(String("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF")));
}

void test_OSEL_select_rejects_missing_hash(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("https://host/fw.bin"), String("0.24.0"), String(""), -60);
  TEST_ASSERT_FALSE(cand.valid);
}

void test_OSEL_select_rejects_invalid_hash_even_with_good_rssi(void) {
  OTASelector sel;
  OtaCandidate cand = sel.select(String("https://host/fw.bin"), String("0.24.0"), String("abc"), -75);
  TEST_ASSERT_FALSE(cand.valid);
}
