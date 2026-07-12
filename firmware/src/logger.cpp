#include "logger.h"
#include <SPIFFS.h>

Logger firmwareLogger;

const char* SpiffsSink::LOG_PATH = "/logs/firmware.log";
const size_t SpiffsSink::MAX_LOG_SIZE = 65536;

Logger::Logger()
  : _sinkCount(0), _level(LOG_INFO), _ringHead(0), _ringTail(0),
    _logCount(0), _errorCount(0), _mutex(nullptr), _initialized(false) {
  memset(_sinks, 0, sizeof(_sinks));
  memset(_ring, 0, sizeof(_ring));
}

bool Logger::init() {
  if (_initialized) return true;

  _mutex = xSemaphoreCreateMutex();
  if (!_mutex) {
    Serial.println("[LOG] Error creando mutex");
    return false;
  }

  _initialized = true;
  Serial.println("[LOG] Logger inicializado");
  return true;
}

void Logger::addSink(LogSink* sink) {
  if (!_initialized || !sink || _sinkCount >= MAX_SINKS) return;

  xSemaphoreTake(_mutex, portMAX_DELAY);
  _sinks[_sinkCount] = sink;
  _sinkCount++;
  xSemaphoreGive(_mutex);

  sink->begin();
}

void Logger::setLevel(LogLevel level) {
  _level = level;
}

LogLevel Logger::getLevel() {
  return _level;
}

void Logger::log(LogLevel level, const char* tag, const char* fmt, ...) {
  if (!_initialized || level > _level) return;

  LogEntry entry;
  entry.level = level;
  entry.timestamp = millis();

  snprintf(entry.tag, sizeof(entry.tag), "%s", tag);

  va_list args;
  va_start(args, fmt);
  vsnprintf(entry.message, sizeof(entry.message), fmt, args);
  va_end(args);

  _addToRing(entry);

  xSemaphoreTake(_mutex, portMAX_DELAY);
  for (int i = 0; i < _sinkCount; i++) {
    if (_sinks[i]) {
      _sinks[i]->write(entry);
    }
  }
  xSemaphoreGive(_mutex);

  if (level <= LOG_ERROR) _errorCount++;
  _logCount++;
}

void Logger::loop() {
  if (!_initialized) return;

  xSemaphoreTake(_mutex, portMAX_DELAY);
  for (int i = 0; i < _sinkCount; i++) {
    if (_sinks[i]) {
      _sinks[i]->flush();
    }
  }
  xSemaphoreGive(_mutex);
}

void Logger::_addToRing(const LogEntry& entry) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  _ring[_ringHead] = entry;
  _ringHead = (_ringHead + 1) % RING_SIZE;
  if (_ringHead == _ringTail) {
    _ringTail = (_ringTail + 1) % RING_SIZE;
  }
  xSemaphoreGive(_mutex);
}

uint32_t Logger::getLogCount() {
  return _logCount;
}

uint32_t Logger::getErrorCount() {
  return _errorCount;
}

void Logger::dumpRecent(int count) {
  xSemaphoreTake(_mutex, portMAX_DELAY);

  int available = (_ringHead - _ringTail + RING_SIZE) % RING_SIZE;
  int toPrint = min(count, available);
  int idx = (_ringHead - toPrint + RING_SIZE) % RING_SIZE;

  Serial.println("=== Recent Logs ===");
  for (int i = 0; i < toPrint; i++) {
    const LogEntry& e = _ring[(idx + i) % RING_SIZE];
    const char* levelStr = "?";
    switch (e.level) {
      case LOG_ERROR: levelStr = "E"; break;
      case LOG_WARN: levelStr = "W"; break;
      case LOG_INFO: levelStr = "I"; break;
      case LOG_DEBUG: levelStr = "D"; break;
      case LOG_VERBOSE: levelStr = "V"; break;
    }
    Serial.printf("[%lu] %s/%s: %s\n", e.timestamp, levelStr, e.tag, e.message);
  }
  Serial.println("===================");

  xSemaphoreGive(_mutex);
}

// === SerialSink ===

static const char* levelPrefix(LogLevel level) {
  switch (level) {
    case LOG_ERROR: return "E";
    case LOG_WARN: return "W";
    case LOG_INFO: return "I";
    case LOG_DEBUG: return "D";
    case LOG_VERBOSE: return "V";
    default: return "?";
  }
}

void SerialSink::write(const LogEntry& entry) {
  Serial.printf("[%lu] %s/%s: %s\n", entry.timestamp, levelPrefix(entry.level), entry.tag, entry.message);
}

// === SpiffsSink ===

void SpiffsSink::begin() {
  if (!SPIFFS.begin(true)) {
    Serial.println("[LOG] SPIFFS no disponible — SpiffsSink deshabilitado");
    _available = false;
    _writeErrors++;
    return;
  }

  _available = true;

  if (!SPIFFS.exists("/logs")) {
    SPIFFS.mkdir("/logs");
  }

  File f = SPIFFS.open(LOG_PATH, "a");
  if (!f) {
    Serial.println("[LOG] No se pudo abrir log file en SPIFFS");
    _available = false;
    _writeErrors++;
    return;
  }

  if (f.size() > MAX_LOG_SIZE) {
    f.close();
    SPIFFS.remove(LOG_PATH);
    f = SPIFFS.open(LOG_PATH, "a");
  }

  _logFile = f;
  Serial.printf("[LOG] SpiffsSink listo (%s)\n", LOG_PATH);
}

void SpiffsSink::write(const LogEntry& entry) {
  if (!_available || !_logFile) return;

  _logFile.printf("[%lu] %s/%s: %s\n", entry.timestamp, levelPrefix(entry.level), entry.tag, entry.message);

  if (_logFile.size() > MAX_LOG_SIZE) {
    _logFile.close();
    SPIFFS.remove(LOG_PATH);
    _logFile = SPIFFS.open(LOG_PATH, "a");
    if (!_logFile) {
      _available = false;
      _writeErrors++;
    }
  }
}

void SpiffsSink::flush() {
  if (_available && _logFile) {
    _logFile.flush();
  }
}

// === MqttSink ===

void MqttSink::setPublishFunc(bool (*func)(const char* topic, const char* payload, bool retained)) {
  _publishFunc = func;
}

void MqttSink::setConnectedFunc(bool (*func)()) {
  _connectedFunc = func;
}

void MqttSink::write(const LogEntry& entry) {
  if (!_publishFunc || !_connectedFunc || !_connectedFunc()) return;

  char payload[200];
  snprintf(payload, sizeof(payload),
    "{\"ts\":%lu,\"lvl\":\"%s\",\"tag\":\"%s\",\"msg\":\"%s\"}",
    entry.timestamp, levelPrefix(entry.level), entry.tag, entry.message);

  _publishFunc("log", payload, false);
}
