#ifndef NATIVE_SPIFFS_STUB_H
#define NATIVE_SPIFFS_STUB_H
#pragma once

// Stub host-only de SPIFFS.h (Arduino-ESP32) para la suite nativa.
// Filesystem plano en memoria (stubs::fsStore()): path -> bytes.
// File copia el contenido al abrir y lo commitea al store en close()/flush(),
// suficiente para los patrones read/write/append de logger.cpp y telemetry_buffer.cpp.

#include "Arduino.h"
#include "stubs_config.h"
#include <stdarg.h>
#include <string.h>

class File {
public:
  File() : _pos(0), _valid(false), _dirty(false) {}

  operator bool() const { return _valid; }

  size_t size() const { return _data.size(); }

  void close() {
    if (_dirty) _commit();
    _valid = false;
    _dirty = false;
  }

  void flush() {
    if (_dirty) _commit();
  }

  size_t write(const uint8_t* data, size_t len) {
    if (!_valid) return 0;
    _data.insert(_data.end(), data, data + len);
    _dirty = true;
    return len;
  }

  size_t read(uint8_t* buf, size_t maxLen) {
    if (!_valid) return 0;
    size_t n = maxLen;
    if (_pos + n > _data.size()) n = _data.size() - _pos;
    if (n) memcpy(buf, _data.data() + _pos, n);
    _pos += n;
    return n;
  }

  bool seek(size_t pos) {
    if (!_valid) return false;
    _pos = pos < _data.size() ? pos : _data.size();
    return true;
  }

  int printf(const char* fmt, ...) {
    if (!_valid) return 0;
    char buf[256];
    va_list args;
    va_start(args, fmt);
    int n = vsnprintf(buf, sizeof(buf), fmt, args);
    va_end(args);
    if (n < 0) n = 0;
    _data.insert(_data.end(), buf, buf + n);
    _dirty = true;
    return n;
  }

private:
  std::string _path;
  std::vector<uint8_t> _data;
  size_t _pos;
  bool _valid;
  bool _dirty;

  void _commit() {
    stubs::fsStore()[_path] = _data;
  }

  friend class SPIFFSClass;
};

class SPIFFSClass {
public:
  bool begin(bool formatOnFail = false) {
    (void)formatOnFail;
    return stubs::spiffsEnabled();
  }

  bool exists(const char* path) const {
    return stubs::fsStore().find(path ? path : "") != stubs::fsStore().end();
  }

  bool mkdir(const char* path) {
    (void)path;
    return true;
  }

  bool remove(const char* path) {
    return stubs::fsStore().erase(path ? path : "") > 0;
  }

  void format() {
    stubs::fsStore().clear();
  }

  File open(const char* path, const char* mode) {
    File f;
    f._path = path ? path : "";
    std::string m = mode ? mode : "r";
    if (m == "r") {
      stubs::FsStore::iterator it = stubs::fsStore().find(f._path);
      if (it == stubs::fsStore().end()) return f;
      f._data = it->second;
      f._valid = true;
      f._pos = 0;
      f._dirty = false;
      return f;
    }
    if (m == "a") {
      stubs::FsStore::iterator it = stubs::fsStore().find(f._path);
      if (it != stubs::fsStore().end()) f._data = it->second;
      f._valid = true;
      f._pos = f._data.size();
      f._dirty = false;
      return f;
    }
    if (m == "w") {
      f._data.clear();
      f._valid = true;
      f._pos = 0;
      f._dirty = true;
      return f;
    }
    return f;
  }
};

inline SPIFFSClass SPIFFS;

#endif
