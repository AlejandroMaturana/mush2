#include "ens160_driver.h"
#include "../../config.h"
#include <Wire.h>
#include <esp_task_wdt.h>

#define ENS160_ADDRESS 0x53

ENS160Driver::ENS160Driver()
  : _present(false), _i2cAddr(ENS160_ADDRESS),
    _ens160(&Wire, ENS160_ADDRESS), _lastTemp(25.0), _lastHum(50.0) {}

bool ENS160Driver::init() {
  Wire.beginTransmission(ENS160_ADDRESS);
  if (Wire.endTransmission() != 0) {
    Serial.println("[ENS160] No detectado");
    _present = false;
    return false;
  }

  _present = true;
  delay(30);
  int retries = 3;
  while (NO_ERR != _ens160.begin() && retries-- > 0) {
    delay(100);
  }
  if (retries < 0) {
    Serial.println("[ENS160] Falló inicialización");
    return false;
  }

  delay(50);
  _ens160.setTempAndHum(25.0f, 50.0f);

  Serial.println("[ENS160] Sensor inicializado");
  return true;
}

bool ENS160Driver::read(void* out) {
  EnsReading* reading = (EnsReading*)out;
  *reading = {0, 0, 0, false};

  if (!_present) return false;

  Wire.beginTransmission(ENS160_ADDRESS);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  esp_task_wdt_reset();

  _ens160.setTempAndHum(_lastTemp, _lastHum);
  int aqi = _ens160.getAQI();
  int eco2 = _ens160.getECO2();
  int tvoc = _ens160.getTVOC();

  if (aqi >= 0 && eco2 >= 0 && tvoc >= 0) {
    reading->aqi = aqi;
    reading->eco2 = eco2;
    reading->tvoc = tvoc;
    reading->valid = true;
  }

  esp_task_wdt_reset();

  return reading->valid;
}

const char* ENS160Driver::getName() {
  return "ENS160";
}

bool ENS160Driver::isPresent() {
  Wire.beginTransmission(ENS160_ADDRESS);
  return Wire.endTransmission() == 0;
}

uint8_t ENS160Driver::getI2CAddress() {
  return ENS160_ADDRESS;
}

DriverInfo ENS160Driver::getDriverInfo() {
  DriverInfo info;
  info.name = "ENS160";
  info.version = "1.0";
  info.i2cAddress = ENS160_ADDRESS;
  info.present = _present;
  return info;
}

void ENS160Driver::setCompensation(float temp, float hum) {
  _lastTemp = temp;
  _lastHum = hum;
}
