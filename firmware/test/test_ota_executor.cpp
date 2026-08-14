#include <unity.h>

#include "ota_executor.h"

// Compilar el modulo de produccion en esta TU (cobertura nativa de PR-H/I105).
#include "../src/ota_executor.cpp"

// ISSUE-052 (FW-003) — OTAExecutor: TLS obligatorio via WiFiClientSecure + CA
// (ADR-014 P4) y hash SHA-256 obligatorio en la descarga.
// Los tests cubren los gates de seguridad (CA, hash, url); la descarga real no
// se ejecuta en host (stubs de red/firmware en test/stubs).

static const char* VALID_64_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

void test_OTAEXEC_ca_not_configured_by_default(void) {
  OTAExecutor ex;
  TEST_ASSERT_FALSE(ex.hasCaCert());
}

void test_OTAEXEC_set_ca_cert_configures_transport(void) {
  OTAExecutor ex;
  ex.setCaCert("-----BEGIN CERTIFICATE-----\nMIIF...");
  TEST_ASSERT_TRUE(ex.hasCaCert());
}

void test_OTAEXEC_set_ca_cert_empty_keeps_disabled(void) {
  OTAExecutor ex;
  ex.setCaCert("");
  TEST_ASSERT_FALSE(ex.hasCaCert());
}

void test_OTAEXEC_begin_rejects_when_ca_not_configured(void) {
  OTAExecutor ex;
  TEST_ASSERT_FALSE(ex.begin(String("https://host/fw.bin"), String(VALID_64_HEX)));
}

void test_OTAEXEC_begin_rejects_missing_hash(void) {
  OTAExecutor ex;
  ex.setCaCert("cert");
  TEST_ASSERT_FALSE(ex.begin(String("https://host/fw.bin"), String("")));
}

void test_OTAEXEC_begin_rejects_invalid_hash(void) {
  OTAExecutor ex;
  ex.setCaCert("cert");
  TEST_ASSERT_FALSE(ex.begin(String("https://host/fw.bin"), String("zz")));
}

void test_OTAEXEC_begin_rejects_http_url(void) {
  OTAExecutor ex;
  ex.setCaCert("cert");
  TEST_ASSERT_FALSE(ex.begin(String("http://host/fw.bin"), String(VALID_64_HEX)));
}

void test_OTAEXEC_begin_rejects_empty_url(void) {
  OTAExecutor ex;
  ex.setCaCert("cert");
  TEST_ASSERT_FALSE(ex.begin(String(""), String(VALID_64_HEX)));
}

void test_OTAEXEC_verify_last_hash_false_after_reject(void) {
  OTAExecutor ex;
  ex.setCaCert("cert");
  ex.begin(String("https://host/fw.bin"), String(""));
  TEST_ASSERT_FALSE(ex.verifyLastHash());
}

void test_OTAEXEC_validate_hash_accepts_64_hex(void) {
  OTAExecutor ex;
  TEST_ASSERT_TRUE(ex.validateExpectedHash(String(VALID_64_HEX)));
}

void test_OTAEXEC_validate_hash_accepts_uppercase_hex(void) {
  OTAExecutor ex;
  TEST_ASSERT_TRUE(ex.validateExpectedHash(String("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF")));
}

void test_OTAEXEC_validate_hash_rejects_short(void) {
  OTAExecutor ex;
  TEST_ASSERT_FALSE(ex.validateExpectedHash(String("abc")));
}

void test_OTAEXEC_validate_hash_rejects_non_hex(void) {
  OTAExecutor ex;
  TEST_ASSERT_FALSE(ex.validateExpectedHash(String("gg3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")));
}
