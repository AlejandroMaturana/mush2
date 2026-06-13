#ifndef AHT_SENSOR_H
#define AHT_SENSOR_H

#include <Arduino.h>

struct SensorReading {
  float temperature;
  float humidity;
  bool valid;
};

class AHTSensor {
public:
  AHTSensor();
  bool init();
  SensorReading read();

private:
  bool initialized;
  uint8_t readStatus();
  bool triggerMeasurement();
  bool readData(uint8_t* data, size_t len);
};

#endif
