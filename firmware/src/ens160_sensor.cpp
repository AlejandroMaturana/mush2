#include "ens160_sensor.h"
#include <Wire.h>
#include <DFRobot_ENS160.h>

#define ENS160_I2C_ADDR 0x53

static DFRobot_ENS160_I2C ens160(&Wire, ENS160_I2C_ADDR);

EnsSensor::EnsSensor() : present(false), i2cAddr(ENS160_I2C_ADDR) {}

bool EnsSensor::init() {
  Wire.beginTransmission(i2cAddr);
  if (Wire.endTransmission() != 0) {
    Serial.println("[ENS160] No detectado en 0x53");
    present = false;
    return false;
  }

  if (NO_ERR != ens160.begin()) {
    Serial.println("[ENS160] Falló begin()");
    present = false;
    return false;
  }

  present = true;
  Serial.println("[ENS160] Inicializado OK");
  return true;
}

EnsReading EnsSensor::read(float temperature, float humidity) {
  EnsReading reading = {0, 0, 0, false};
  if (!present) return reading;

  ens160.setTempAndHum(temperature, humidity);

  reading.aqi = ens160.getAQI();
  reading.eco2 = ens160.getECO2();
  reading.tvoc = ens160.getTVOC();

  if (reading.eco2 > 0) {
    reading.valid = true;
  }

  return reading;
}

bool EnsSensor::isPresent() {
  return present;
}
