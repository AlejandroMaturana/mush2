#ifndef LOGGER_H
#define LOGGER_H

#include <Arduino.h>
#include <SPIFFS.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

enum LogLevel {
  LOG_ERROR = 0,
  LOG_WARN = 1,
  LOG_INFO = 2,
  LOG_DEBUG = 3,
  LOG_VERBOSE = 4
};

struct LogEntry {
  LogLevel level;
  uint32_t timestamp;
  char tag[16];
  char message[128];
};

class LogSink {
public:
  virtual ~LogSink() {}
  virtual void begin() {}
  virtual void write(const LogEntry& entry) = 0;
  virtual void flush() {}
};

class SerialSink : public LogSink {
public:
  void write(const LogEntry& entry) override;
};

class SpiffsSink : public LogSink {
public:
  void begin() override;
  void write(const LogEntry& entry) override;
  void flush() override;
  int getWriteErrors() { return _writeErrors; }
private:
  File _logFile;
  int _writeErrors = 0;
  bool _available = false;
  static const char* LOG_PATH;
  static const size_t MAX_LOG_SIZE;
};

class MqttSink : public LogSink {
public:
  void write(const LogEntry& entry) override;
  void setPublishFunc(bool (*func)(const char* topic, const char* payload, bool retained));
  void setConnectedFunc(bool (*func)());
private:
  bool (*_publishFunc)(const char*, const char*, bool) = nullptr;
  bool (*_connectedFunc)() = nullptr;
};

class Logger {
public:
  Logger();
  bool init();
  void addSink(LogSink* sink);
  void setLevel(LogLevel level);
  LogLevel getLevel();
  void log(LogLevel level, const char* tag, const char* fmt, ...);
  void loop();
  uint32_t getLogCount();
  uint32_t getErrorCount();
  void dumpRecent(int count = 20);
private:
  static const int MAX_SINKS = 4;
  static const int RING_SIZE = 64;

  LogSink* _sinks[MAX_SINKS];
  int _sinkCount;
  LogLevel _level;
  LogEntry _ring[RING_SIZE];
  int _ringHead;
  int _ringTail;
  uint32_t _logCount;
  uint32_t _errorCount;
  SemaphoreHandle_t _mutex;
  bool _initialized;

  void _addToRing(const LogEntry& entry);
};

#define LOG_E(tag, fmt, ...) firmwareLogger.log(LOG_ERROR, tag, fmt, ##__VA_ARGS__)
#define LOG_W(tag, fmt, ...) firmwareLogger.log(LOG_WARN, tag, fmt, ##__VA_ARGS__)
#define LOG_I(tag, fmt, ...) firmwareLogger.log(LOG_INFO, tag, fmt, ##__VA_ARGS__)
#define LOG_D(tag, fmt, ...) firmwareLogger.log(LOG_DEBUG, tag, fmt, ##__VA_ARGS__)
#define LOG_V(tag, fmt, ...) firmwareLogger.log(LOG_VERBOSE, tag, fmt, ##__VA_ARGS__)

extern Logger firmwareLogger;

#endif
