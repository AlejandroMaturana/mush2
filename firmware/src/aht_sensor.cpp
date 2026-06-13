#include "aht_sensor.h"
#include <Wire.h>

#define AHT_ADDRESS 0x38
#define AHT_CMD_INIT 0xBE
#define AHT_CMD_TRIGGER 0xAC
#define AHT_CMD_RESET 0xBA
#define AHT_STATUS_BUSY 0x80

AHTSensor::AHTSensor() : initialized(false) {}

bool AHTSensor::init() {
  Wire.beginTransmission(AHT_ADDRESS);
  if (Wire.endTransmission() != 0) {
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

bool AHTSensor::triggerMeasurement() {
  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_TRIGGER);
  Wire.write(0x33);
  Wire.write(0x00);
  return Wire.endTransmission() == 0;
}

bool AHTSensor::readData(uint8_t* data, size_t len) {
  size_t received = Wire.requestFrom(AHT_ADDRESS, len);
  if (received != len) return false;
  for (size_t i = 0; i < len; i++) {
    data[i] = Wire.read();
  }
  return true;
}

uint8_t AHTSensor::readStatus() {
  Wire.requestFrom((int)AHT_ADDRESS, 1);
  if (Wire.available()) return Wire.read();
  return 0xFF;
}

SensorReading AHTSensor::read() {
  SensorReading reading = {0, 0, false};

  // Soft reset before each measurement for I2C bus recovery
  Wire.beginTransmission(AHT_ADDRESS);
  Wire.write(AHT_CMD_RESET);
  Wire.endTransmission();
  delay(20);

  if (!triggerMeasurement()) {
    // Retry: re-init + trigger
    Wire.beginTransmission(AHT_ADDRESS);
    Wire.write(AHT_CMD_INIT);
    Wire.write(0x08);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(10);

    if (!triggerMeasurement()) {
      Serial.println("[AHT] Falló trigger de medición tras reinicio");
      return reading;
    }
  }

  delay(80);

  uint8_t data[6];
  if (!readData(data, 6)) {
    Serial.println("[AHT] Falló lectura de datos");
    return reading;
  }

  if ((data[0] & 0x80) != 0) {
    Serial.println("[AHT] Sensor ocupado");
    return reading;
  }

  if ((data[0] & 0x40) != 0) {
    Serial.println("[AHT] Falló checksum CRC");
    return reading;
  }

  uint32_t rawHum = ((uint32_t)data[1] << 12) | ((uint32_t)data[2] << 4) | ((uint32_t)data[3] >> 4);
  uint32_t rawTemp = (((uint32_t)data[3] & 0x0F) << 16) | ((uint32_t)data[4] << 8) | data[5];

  reading.humidity = (rawHum * 100.0) / 1048576.0;
  reading.temperature = (rawTemp * 200.0) / 1048576.0 - 50.0;
  reading.valid = true;

  return reading;
}
