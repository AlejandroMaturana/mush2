#ifndef ENS160_DRIVER_H
#define ENS160_DRIVER_H

#include "../../i_sensor.h"
#include "../../ens160_sensor.h"
#include <DFRobot_ENS160.h>

class ENS160Driver : public ISensor {
public:
  ENS160Driver();
  bool init() override;
  bool read(void* out) override;
  const char* getName() override;
  bool isPresent() override;
  uint8_t getI2CAddress() override;
  DriverInfo getDriverInfo() override;
  void setCompensation(float temp, float hum);

private:
  bool _present;
  uint8_t _i2cAddr;
  DFRobot_ENS160_I2C _ens160;
  float _lastTemp;
  float _lastHum;
};

#endif
