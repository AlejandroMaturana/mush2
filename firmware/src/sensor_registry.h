#ifndef SENSOR_REGISTRY_H
#define SENSOR_REGISTRY_H

#include <Arduino.h>
#include "i_sensor.h"

#define MAX_SENSORS 4

class SensorRegistry {
public:
  void init();
  void autoDetect();
  ISensor* getSensor(const char* name);
  ISensor* getSensorByIndex(uint8_t index);
  uint8_t getSensorCount();
  void printStatus();

private:
  ISensor* _sensors[MAX_SENSORS];
  uint8_t _count;
};

extern SensorRegistry sensorRegistry;

#endif
