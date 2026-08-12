#include <unity.h>

// Suites nativas del firmware. Cada test_*.cpp define sus test cases; este
// archivo es el único que define setUp/tearDown/main (regla Unity + PlatformIO:
// un solo main por binario nativo).

void test_CH_T08_gpio_unique_per_channel(void);
void test_CH_T09_gpio_bijective(void);

void test_I59_provisioned_always_wins(void);
void test_I59_default_fallback_only_first_boot(void);
void test_I59_no_credentials_on_subsequent_boot(void);
void test_I59_fallback_reachable_exactly_once(void);

void setUp(void) {}
void tearDown(void) {}

int main(int argc, char **argv) {
  UNITY_BEGIN();

  // EDD-006 §8 — channel mapping
  RUN_TEST(test_CH_T08_gpio_unique_per_channel);
  RUN_TEST(test_CH_T09_gpio_bijective);

  // ISSUE-059 (FW-010) — política de credenciales MQTT (ADR-028)
  RUN_TEST(test_I59_provisioned_always_wins);
  RUN_TEST(test_I59_default_fallback_only_first_boot);
  RUN_TEST(test_I59_no_credentials_on_subsequent_boot);
  RUN_TEST(test_I59_fallback_reachable_exactly_once);

  return UNITY_END();
}
