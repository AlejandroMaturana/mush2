#ifndef TELEMETRY_BUFFER_H
#define TELEMETRY_BUFFER_H

#include <Arduino.h>
#include <SPIFFS.h>
#include "event_bus.h"

struct TelemetryEntry {
  uint32_t timestamp;
  float temperature;
  float humidity;
  uint16_t eco2;
  uint16_t tvoc;
  uint8_t aqi;
  uint8_t flags;
};

class TelemetryBuffer {
public:
  TelemetryBuffer();
  bool init(EventBus* bus);
  void push(float temp, float hum, uint16_t eco2, uint16_t tvoc, uint8_t aqi);
  bool pop(TelemetryEntry* entry);
  bool hasPending();
  uint32_t count();
  void spillToSPIFFS();
  bool loadFromSPIFFS();
  void clear();
  void clearSPIFFS();
  uint32_t getSpillCount();

private:
  static const int RAM_CAPACITY = 200;
  static const char* SPIFFS_PATH;
  static const size_t MAX_SPIFFS_SIZE;

  TelemetryEntry _buffer[RAM_CAPACITY];
  int _head;
  int _tail;
  uint32_t _totalCount;
  uint32_t _spillCount;
  bool _initialized;
  EventBus* _bus;

  bool _writeToSPIFFS(const TelemetryEntry* entries, int count);
  int _readFromSPIFFS(TelemetryEntry* entries, int maxCount);
};

extern TelemetryBuffer telemetryBuffer;

#endif
