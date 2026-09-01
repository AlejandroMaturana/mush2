#ifndef NATIVE_HTTPCLIENT_STUB_H
#define NATIVE_HTTPCLIENT_STUB_H
#pragma once

// Stub host-only de HTTPClient.h para la suite nativa (pio test -c platformio.test.ini).
// NO se usa en el build de dispositivo. Solo declara la API que ota_executor.cpp
// necesita compilar; no hay red en host, la descarga OTA nunca se ejecuta.

#include <stdint.h>
#include <stddef.h>

#include "Arduino.h"
#include "WiFi.h"
#include "WiFiClientSecure.h"

typedef enum {
  HTTPC_DISABLE_FOLLOW_REDIRECTS = 0,
  HTTPC_FORCE_FOLLOW_REDIRECTS = 1
} followRedirects_t;

class HTTPClient {
public:
  HTTPClient() {}
  bool begin(const String& url) { (void)url; return false; }
  bool begin(WiFiClientSecure& client, const String& url) { (void)client; (void)url; return false; }
  void setTimeout(int ms) { (void)ms; }
  void setFollowRedirects(followRedirects_t follow) { (void)follow; }
  void end() {}
  bool connected() { return false; }
  int GET() { return 0; }
  int getSize() { return 0; }
  WiFiClient* getStreamPtr() { return nullptr; }
};

#endif // NATIVE_HTTPCLIENT_STUB_H
