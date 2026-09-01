#ifndef NATIVE_UPDATE_STUB_H
#define NATIVE_UPDATE_STUB_H
#pragma once

// Stub host-only de Update.h para la suite nativa (pio test -c platformio.test.ini).
// NO se usa en el build de dispositivo. Solo declara la API que ota_executor.cpp
// necesita compilar; el flasheo de particiones no se ejecuta en host.

#include <stdint.h>
#include <stddef.h>

#define U_FLASH 0

class UpdateClass {
public:
  bool begin(size_t size, int command = U_FLASH) { (void)size; (void)command; return false; }
  size_t write(const uint8_t* data, size_t len) { (void)data; (void)len; return 0; }
  void abort() {}
  bool end() { return false; }
  const char* errorString() { return "stub"; }
};

inline UpdateClass Update;

#endif // NATIVE_UPDATE_STUB_H
