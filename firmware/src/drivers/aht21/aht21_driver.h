#ifndef AHT21_DRIVER_H
#define AHT21_DRIVER_H

#include "../../i_sensor.h"
#include "../../aht_sensor.h"

class AHT21Driver : public ISensor {
public:
  AHT21Driver();
  bool init() override;
  bool read(void* out) override;
  const char* getName() override;
  bool isPresent() override;
  uint8_t getI2CAddress() override;
  DriverInfo getDriverInfo() override;

private:
  bool _initialized;
  uint8_t _readStatus();
  bool _triggerMeasurement();
  bool _readData(uint8_t* data, size_t len);
};

#endif
