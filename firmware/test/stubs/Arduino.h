#ifndef NATIVE_ARDUINO_STUB_H
#define NATIVE_ARDUINO_STUB_H
#pragma once

// Stub host-only de Arduino.h para la suite nativa (pio test -c platformio.test.ini).
// NO se usa en el build de dispositivo. Provee unicamente lo que los modulos de
// src/ necesitan para compilar y ejecutarse fuera del ESP32-S3.

#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string>

#include "stubs_config.h"

typedef bool boolean;

#define PROGMEM

// GPIO numericos (usados por mapeos canonicos en caso de incluir channel_mapping.h)
#define GPIO_NUM_4  4
#define GPIO_NUM_5  5
#define GPIO_NUM_6  6
#define GPIO_NUM_48 48

#ifndef min
#define min(a, b) ((a) < (b) ? (a) : (b))
#endif
#ifndef max
#define max(a, b) ((a) > (b) ? (a) : (b))
#endif

// String minima compatible con las operaciones usadas en ota_decisor/ota_nvs.
class String {
public:
  String() {}
  String(const char* s) : _data(s ? s : "") {}
  String(const String& o) : _data(o._data) {}
  String& operator=(const char* s) { _data = s ? s : ""; return *this; }
  String& operator=(const String& o) { _data = o._data; return *this; }
  bool operator==(const char* s) const { return _data == s; }
  bool operator!=(const char* s) const { return _data != s; }
  const char* c_str() const { return _data.c_str(); }
  size_t length() const { return _data.length(); }
  bool empty() const { return _data.empty(); }
  char charAt(unsigned int i) const { return i < _data.length() ? _data[i] : '\0'; }
  bool startsWith(const char* prefix) const {
    size_t n = strlen(prefix ? prefix : "");
    return _data.compare(0, n, prefix ? prefix : "") == 0;
  }
  bool startsWith(const String& prefix) const { return startsWith(prefix.c_str()); }
  bool endsWith(const char* suffix) const {
    size_t n = strlen(suffix ? suffix : "");
    if (n > _data.length()) return false;
    return _data.compare(_data.length() - n, n, suffix ? suffix : "") == 0;
  }
  bool endsWith(const String& suffix) const { return endsWith(suffix.c_str()); }

private:
  std::string _data;
};

inline String operator+(const String& a, const char* b) { return (a.c_str() + std::string(b)).c_str(); }

// millis() controlable por los tests via stubs::millisValue() (stubs_config.h).
inline unsigned long millis() { return stubs::millisValue(); }

// plantillas requeridas por Arduino (HAL nativo inexistente aqui).
// Variabel inline (C++17): una sola instancia en el binario nativo.
struct SerialStub {
  void print(const char*) {}
  void println(const char*) {}
  void println(int) {}
  void println(unsigned long) {}
  void printf(const char*, ...) {}
  void flush() {}
};
inline SerialStub Serial;

#endif // NATIVE_ARDUINO_STUB_H