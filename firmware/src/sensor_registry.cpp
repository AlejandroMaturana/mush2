#include "sensor_registry.h"
#include "drivers/aht21/aht21_driver.h"
#include "drivers/ens160/ens160_driver.h"

SensorRegistry sensorRegistry;

void SensorRegistry::init() {
  _count = 0;
  memset(_sensors, 0, sizeof(_sensors));
}

void SensorRegistry::autoDetect() {
  Serial.println("[REGISTRY] Auto-detecting sensors...");

  AHT21Driver* aht = new AHT21Driver();
  if (aht->init() && _count < MAX_SENSORS) {
    _sensors[_count++] = aht;
    Serial.printf("[REGISTRY] Added: %s at 0x%02X\n", aht->getName(), aht->getI2CAddress());
  } else {
    delete aht;
    Serial.println("[REGISTRY] AHT21 not detected");
  }

  ENS160Driver* ens = new ENS160Driver();
  if (ens->init() && _count < MAX_SENSORS) {
    _sensors[_count++] = ens;
    Serial.printf("[REGISTRY] Added: %s at 0x%02X\n", ens->getName(), ens->getI2CAddress());
  } else {
    delete ens;
    Serial.println("[REGISTRY] ENS160 not detected");
  }

  Serial.printf("[REGISTRY] %d sensor(s) registered\n", _count);
}

ISensor* SensorRegistry::getSensor(const char* name) {
  for (uint8_t i = 0; i < _count; i++) {
    if (strcmp(_sensors[i]->getName(), name) == 0) {
      return _sensors[i];
    }
  }
  return nullptr;
}

ISensor* SensorRegistry::getSensorByIndex(uint8_t index) {
  if (index >= _count) return nullptr;
  return _sensors[index];
}

uint8_t SensorRegistry::getSensorCount() {
  return _count;
}

void SensorRegistry::printStatus() {
  Serial.println("[REGISTRY] === Sensor Status ===");
  for (uint8_t i = 0; i < _count; i++) {
    DriverInfo info = _sensors[i]->getDriverInfo();
    Serial.printf("[REGISTRY]   %s (0x%02X): %s\n",
      info.name, info.i2cAddress, info.present ? "ACTIVE" : "INACTIVE");
  }
}
