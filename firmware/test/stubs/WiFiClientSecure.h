#ifndef NATIVE_WIFICLIENTSECURE_STUB_H
#define NATIVE_WIFICLIENTSECURE_STUB_H
#pragma once

// Stub host-only de WiFiClientSecure.h para la suite nativa
// (pio test -c platformio.test.ini). NO se usa en el build de dispositivo.
// Declara el subconjunto que ota_executor.cpp necesita compilar; la conexion
// TLS no se ejecuta en host (los tests cubren los gates de seguridad).

#include "WiFi.h"

class WiFiClientSecure : public WiFiClient {
public:
  WiFiClientSecure() {}
  void setCACert(const char* cert) { (void)cert; }
};

#endif // NATIVE_WIFICLIENTSECURE_STUB_H
