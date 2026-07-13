#include "aht21_driver.h"
#include "../../config.h"
#include <Wire.h>
#include <esp_task_wdt.h>

#define AHT_ADDRESS 0x38
#define AHT_CMD_INIT 0xBE
#define AHT_CMD_TRIGGER 0xAC
#define AHT_CMD_RESET 0xBA
#define AHT_STATUS_BUSY 0x80

AHT21Driver::AHT21Driver() : _initialized(false) {}

bool AHT21Driver::init() {
  Wire.beginTransmission(AHT_ADDRESS);
  if (Wire.endTransmission() != 0) {
    Serial.println("[AHT21] Sensor no detectado en 0x38");
    return false;
  }

  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_INIT);
  Wire.write(0x08);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    Serial.println("[AHT21] Falló inicialización");
    return false;
  }

  delay(10);
  _initialized = true;
  Serial.println("[AHT21] Sensor inicializado");
  return true;
}

bool AHT21Driver::read(void* out) {
  SensorReading* reading = (SensorReading*)out;
  *reading = {0, 0, false};

  if (!_initialized) return false;

  Wire.beginTransmission(AHT_ADDRESS);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  esp_task_wdt_reset();

  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_TRIGGER);
  Wire.write(0x33);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  esp_task_wdt_reset();
  vTaskDelay(pdMS_TO_TICKS(80));
  esp_task_wdt_reset();

  size_t received = Wire.requestFrom((int)AHT_ADDRESS, (int)6);
  if (received != 6) return false;

  uint8_t data[6];
  for (size_t i = 0; i < 6; i++) {
    data[i] = Wire.read();
  }

  if ((data[0] & 0x80) != 0) return false;

  uint32_t rawHum = ((uint32_t)data[1] << 12) | ((uint32_t)data[2] << 4) | ((uint32_t)data[3] >> 4);
  uint32_t rawTemp = (((uint32_t)data[3] & 0x0F) << 16) | ((uint32_t)data[4] << 8) | data[5];

  reading->humidity = (rawHum * 100.0) / 1048576.0;
  reading->temperature = (rawTemp * 200.0) / 1048576.0 - 50.0;
  reading->valid = true;

  return true;
}

const char* AHT21Driver::getName() {
  return "AHT21";
}

bool AHT21Driver::isPresent() {
  Wire.beginTransmission(AHT_ADDRESS);
  return Wire.endTransmission() == 0;
}

uint8_t AHT21Driver::getI2CAddress() {
  return AHT_ADDRESS;
}

DriverInfo AHT21Driver::getDriverInfo() {
  DriverInfo info;
  info.name = "AHT21";
  info.version = "1.0";
  info.i2cAddress = AHT_ADDRESS;
  info.present = _initialized;
  return info;
}

uint8_t AHT21Driver::_readStatus() {
  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(0x71);
  Wire.endTransmission();
  Wire.requestFrom((int)AHT_ADDRESS, (int)1);
  return Wire.read();
}

bool AHT21Driver::_triggerMeasurement() {
  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_TRIGGER);
  Wire.write(0x33);
  Wire.write(0x00);
  return Wire.endTransmission() == 0;
}

bool AHT21Driver::_readData(uint8_t* data, size_t len) {
  size_t received = Wire.requestFrom((int)AHT_ADDRESS, (int)len);
  if (received != len) return false;
  for (size_t i = 0; i < len; i++) {
    data[i] = Wire.read();
  }
  return true;
}
