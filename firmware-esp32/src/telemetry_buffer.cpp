#include "telemetry_buffer.h"
#include "logger.h"

TelemetryBuffer telemetryBuffer;

const char* TelemetryBuffer::SPIFFS_PATH = "/telemetry/pending.bin";
const size_t TelemetryBuffer::MAX_SPIFFS_SIZE = 65536;

TelemetryBuffer::TelemetryBuffer()
  : _head(0), _tail(0), _totalCount(0), _spillCount(0),
    _initialized(false), _bus(nullptr) {
  memset(_buffer, 0, sizeof(_buffer));
}

bool TelemetryBuffer::init(EventBus* bus) {
  if (_initialized) return true;

  _bus = bus;

  if (!SPIFFS.begin(true)) {
    LOG_W("TELEM_BUF", "SPIFFS no disponible — buffer sin spill a disco");
    _initialized = true;
    return false;
  }

  if (!SPIFFS.exists("/telemetry")) {
    SPIFFS.mkdir("/telemetry");
  }

  loadFromSPIFFS();

  _initialized = true;
  LOG_I("TELEM_BUF", "Inicializado (RAM=%d, SPIFFS=%lu bytes pendientes)",
    RAM_CAPACITY, count() * sizeof(TelemetryEntry));
  return true;
}

void TelemetryBuffer::push(float temp, float hum, uint16_t eco2, uint16_t tvoc, uint8_t aqi) {
  if (!_initialized) return;

  TelemetryEntry entry;
  entry.timestamp = millis();
  entry.temperature = temp;
  entry.humidity = hum;
  entry.eco2 = eco2;
  entry.tvoc = tvoc;
  entry.aqi = aqi;
  entry.flags = 0;

  int nextHead = (_head + 1) % RAM_CAPACITY;

  if (nextHead == _tail) {
    spillToSPIFFS();
    _tail = (_tail + 1) % RAM_CAPACITY;
    _spillCount++;
  }

  _buffer[_head] = entry;
  _head = nextHead;
  _totalCount++;

  if (_bus) {
    Event event;
    event.type = EVT_TELEMETRY_READY;
    event.timestamp = millis();
    event.payload.telemetryReady.temperature = temp;
    event.payload.telemetryReady.humidity = hum;
    event.payload.telemetryReady.eco2 = eco2;
    event.payload.telemetryReady.tvoc = tvoc;
    event.payload.telemetryReady.aqi = aqi;
    _bus->publish(event);
  }
}

bool TelemetryBuffer::pop(TelemetryEntry* entry) {
  if (!_initialized || !entry) return false;

  if (_tail == _head) {
    TelemetryEntry spiffsEntry;
    if (_readFromSPIFFS(&spiffsEntry, 1) == 1) {
      *entry = spiffsEntry;
      return true;
    }
    return false;
  }

  *entry = _buffer[_tail];
  _tail = (_tail + 1) % RAM_CAPACITY;
  return true;
}

bool TelemetryBuffer::hasPending() {
  if (_tail != _head) return true;

  File f = SPIFFS.open(SPIFFS_PATH, "r");
  if (f && f.size() > 0) {
    f.close();
    return true;
  }
  if (f) f.close();

  return false;
}

uint32_t TelemetryBuffer::count() {
  uint32_t ramCount = (_head - _tail + RAM_CAPACITY) % RAM_CAPACITY;

  File f = SPIFFS.open(SPIFFS_PATH, "r");
  if (!f) return ramCount;

  uint32_t spiffsCount = f.size() / sizeof(TelemetryEntry);
  f.close();

  return ramCount + spiffsCount;
}

void TelemetryBuffer::spillToSPIFFS() {
  if (_tail == _head) return;

  int available = (_head - _tail + RAM_CAPACITY) % RAM_CAPACITY;
  int toWrite = min(available, (int)(MAX_SPIFFS_SIZE / sizeof(TelemetryEntry)));

  TelemetryEntry entries[32];
  int written = 0;

  while (written < toWrite) {
    int batch = min(toWrite - written, 32);
    for (int i = 0; i < batch; i++) {
      entries[i] = _buffer[_tail];
      _tail = (_tail + 1) % RAM_CAPACITY;
    }
    _writeToSPIFFS(entries, batch);
    written += batch;
  }

  LOG_D("TELEM_BUF", "Spill a SPIFFS: %d entradas", written);
}

bool TelemetryBuffer::_writeToSPIFFS(const TelemetryEntry* entries, int count) {
  File f = SPIFFS.open(SPIFFS_PATH, "a");
  if (!f) {
    LOG_E("TELEM_BUF", "Error abriendo SPIFFS para escritura");
    return false;
  }

  size_t written = f.write((const uint8_t*)entries, count * sizeof(TelemetryEntry));
  f.close();

  if (written != count * sizeof(TelemetryEntry)) {
    LOG_E("TELEM_BUF", "Escritura incompleta: %u de %u bytes", written, count * sizeof(TelemetryEntry));
    return false;
  }

  return true;
}

int TelemetryBuffer::_readFromSPIFFS(TelemetryEntry* entries, int maxCount) {
  File f = SPIFFS.open(SPIFFS_PATH, "r");
  if (!f || f.size() == 0) {
    if (f) f.close();
    return 0;
  }

  int available = f.size() / sizeof(TelemetryEntry);
  int toRead = min(available, maxCount);

  size_t read = f.read((uint8_t*)entries, toRead * sizeof(TelemetryEntry));
  f.close();

  int readCount = read / sizeof(TelemetryEntry);

  if (readCount < available) {
    File fIn = SPIFFS.open(SPIFFS_PATH, "r");
    if (fIn) {
      fIn.seek(readCount * sizeof(TelemetryEntry));
      int remaining = available - readCount;
      TelemetryEntry* remainingBuf = new TelemetryEntry[remaining];
      fIn.read((uint8_t*)remainingBuf, remaining * sizeof(TelemetryEntry));
      fIn.close();

      File fOut = SPIFFS.open(SPIFFS_PATH, "w");
      if (fOut) {
        fOut.write((const uint8_t*)remainingBuf, remaining * sizeof(TelemetryEntry));
        fOut.close();
      }
      delete[] remainingBuf;
    }
  } else {
    SPIFFS.remove(SPIFFS_PATH);
  }

  return readCount;
}

bool TelemetryBuffer::loadFromSPIFFS() {
  File f = SPIFFS.open(SPIFFS_PATH, "r");
  if (!f || f.size() == 0) {
    if (f) f.close();
    return false;
  }

  uint32_t fileSize = f.size();
  uint32_t entries = fileSize / sizeof(TelemetryEntry);
  f.close();

  LOG_I("TELEM_BUF", "SPIFFS: %lu entradas pendientes (%lu bytes)", entries, fileSize);
  return true;
}

void TelemetryBuffer::clear() {
  _head = 0;
  _tail = 0;
  _totalCount = 0;
  _spillCount = 0;
}

void TelemetryBuffer::clearSPIFFS() {
  SPIFFS.remove(SPIFFS_PATH);
  LOG_I("TELEM_BUF", "SPIFFS buffer limpiado");
}

uint32_t TelemetryBuffer::getSpillCount() {
  return _spillCount;
}
