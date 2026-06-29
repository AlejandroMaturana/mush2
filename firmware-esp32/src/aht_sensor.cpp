#include "aht_sensor.h"
#include "config.h"
#include <Wire.h>
#include <esp_task_wdt.h>

#define AHT_ADDRESS 0x38
#define AHT_CMD_INIT 0xBE
#define AHT_CMD_TRIGGER 0xAC
#define AHT_CMD_RESET 0xBA
#define AHT_STATUS_BUSY 0x80

AHTSensor::AHTSensor() : initialized(false) {}

static bool probeAHT() {
  Wire.beginTransmission(AHT_ADDRESS);
  return Wire.endTransmission() == 0;
}

bool AHTSensor::init() {
  if (!probeAHT()) {
    Serial.println("[AHT] Sensor no detectado en 0x38");
    return false;
  }

  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_INIT);
  Wire.write(0x08);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    Serial.println("[AHT] Falló inicialización");
    return false;
  }

  delay(10);
  initialized = true;
  Serial.println("[AHT] Sensor inicializado");
  return true;
}

SensorReading AHTSensor::read() {
  SensorReading reading = {0, 0, false};
  if (!initialized) return reading;

  // Check sensor presence
  if (!probeAHT()) {
    return reading;
  }

  esp_task_wdt_reset();

  // Trigger measurement
  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_TRIGGER);
  Wire.write(0x33);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    return reading;
  }

  esp_task_wdt_reset();

  // Wait for conversion (AHT21 max 80ms)
  delay(80);

  esp_task_wdt_reset();

  // Read 6 bytes
  size_t received = Wire.requestFrom(AHT_ADDRESS, (uint8_t)6);
  if (received != 6) return reading;

  uint8_t data[6];
  for (size_t i = 0; i < 6; i++) {
    data[i] = Wire.read();
  }

  if ((data[0] & 0x80) != 0) return reading;

  uint32_t rawHum = ((uint32_t)data[1] << 12) | ((uint32_t)data[2] << 4) | ((uint32_t)data[3] >> 4);
  uint32_t rawTemp = (((uint32_t)data[3] & 0x0F) << 16) | ((uint32_t)data[4] << 8) | data[5];

  reading.humidity = (rawHum * 100.0) / 1048576.0;
  reading.temperature = (rawTemp * 200.0) / 1048576.0 - 50.0;
  reading.valid = true;

  return reading;
}
