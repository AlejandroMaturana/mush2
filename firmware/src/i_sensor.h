#ifndef I_SENSOR_H
#define I_SENSOR_H

#include <Arduino.h>

struct DriverInfo {
  const char* name;
  const char* version;
  uint8_t i2cAddress;
  bool present;
};

class ISensor {
public:
  virtual ~ISensor() {}
  virtual bool init() = 0;
  virtual bool read(void* out) = 0;
  virtual const char* getName() = 0;
  virtual bool isPresent() = 0;
  virtual uint8_t getI2CAddress() = 0;
  virtual DriverInfo getDriverInfo() = 0;
};

#endif
