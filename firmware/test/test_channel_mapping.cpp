#include <unity.h>

#include "channel_mapping.h"

void setUp(void) {}
void tearDown(void) {}

// CH-T08 (EDD-006 §8): cada GPIO (11, 12, 13, 14) se asigna a exactamente un CH.
void test_CH_T08_gpio_unique_per_channel(void) {
  const uint8_t pins[CHANNEL_PINS_COUNT] = {
      CHANNEL_1_PIN, CHANNEL_2_PIN, CHANNEL_3_PIN, CHANNEL_4_PIN,
  };

  for (int i = 0; i < CHANNEL_PINS_COUNT; i++) {
    TEST_ASSERT_TRUE(pins[i] >= 0 && pins[i] <= 48);
  }

  for (int i = 0; i < CHANNEL_PINS_COUNT; i++) {
    for (int j = i + 1; j < CHANNEL_PINS_COUNT; j++) {
      TEST_ASSERT_NOT_EQUAL_UINT8(pins[i], pins[j]);
    }
  }
}

// CH-T09 (EDD-006 §8): cada CH corresponde a exactamente un GPIO (biyección).
void test_CH_T09_gpio_bijective(void) {
  const uint8_t pins[CHANNEL_PINS_COUNT] = {
      CHANNEL_1_PIN, CHANNEL_2_PIN, CHANNEL_3_PIN, CHANNEL_4_PIN,
  };
  const uint8_t expected[CHANNEL_PINS_COUNT] = {11, 12, 13, 14};

  TEST_ASSERT_EQUAL_UINT8_ARRAY(expected, pins, CHANNEL_PINS_COUNT);

  for (int k = 0; k < CHANNEL_PINS_COUNT; k++) {
    int count = 0;
    for (int i = 0; i < CHANNEL_PINS_COUNT; i++) {
      if (pins[i] == expected[k]) count++;
    }
    TEST_ASSERT_EQUAL_INT(1, count);
  }
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_CH_T08_gpio_unique_per_channel);
  RUN_TEST(test_CH_T09_gpio_bijective);
  return UNITY_END();
}
