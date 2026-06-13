#ifndef ENS160_SENSOR_H
#define ENS160_SENSOR_H

#include <Arduino.h>

struct EnsReading {
  uint8_t aqi;
  uint16_t eco2;
  uint16_t tvoc;
  bool valid;
};

class EnsSensor {
public:
  EnsSensor();
  bool init();
  EnsReading read(float temperature, float humidity);
  bool isPresent();

private:
  bool present;
  uint8_t i2cAddr;
};

#endif
