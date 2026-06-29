#ifndef ENS160_SENSOR_H
#define ENS160_SENSOR_H

#include <Arduino.h>
#include <DFRobot_ENS160.h>

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
  bool _present;
  uint8_t _i2cAddr;
  DFRobot_ENS160_I2C _ens160;
};

#endif
