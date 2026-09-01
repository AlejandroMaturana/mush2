#ifndef NATIVE_WIFI_STUB_H
#define NATIVE_WIFI_STUB_H
#pragma once

// Stub host-only de WiFi.h para la suite nativa (pio test -c platformio.test.ini).
// NO se usa en el build de dispositivo. Solo declara el subconjunto que
// ota_executor.cpp necesita para compilar; la descarga OTA no se ejecuta en
// host (los tests cubren unicamente los gates de seguridad del executor).

#include <stdint.h>
#include <stddef.h>

class WiFiClient {
public:
  WiFiClient() {}
  int available() { return 0; }
  size_t readBytes(uint8_t* buffer, size_t len) { (void)buffer; (void)len; return 0; }
};

#endif // NATIVE_WIFI_STUB_H
