#include "ens160_sensor.h"
#include "config.h"
#include <Wire.h>
#include <esp_task_wdt.h>

#define ENS160_ADDRESS 0x53

EnsSensor::EnsSensor() : _present(false), _i2cAddr(ENS160_ADDRESS), _ens160(&Wire, ENS160_ADDRESS) {}

static bool probeENS160() {
  Wire.beginTransmission(ENS160_ADDRESS);
  return Wire.endTransmission() == 0;
}

bool EnsSensor::init() {
  if (!probeENS160()) {
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

EnsReading EnsSensor::read(float temp, float hum) {
  EnsReading reading = {0, 0, 0, false};
  if (!_present) return reading;

  if (!probeENS160()) {
    return reading;
  }

  esp_task_wdt_reset();

  _ens160.setTempAndHum(temp, hum);
  int aqi = _ens160.getAQI();
  int eco2 = _ens160.getECO2();
  int tvoc = _ens160.getTVOC();

  if (aqi >= 0 && eco2 >= 0 && tvoc >= 0) {
    reading.aqi = aqi;
    reading.eco2 = eco2;
    reading.tvoc = tvoc;
    reading.valid = true;
  }

  esp_task_wdt_reset();

  return reading;
}

bool EnsSensor::isPresent() {
  return _present;
}
