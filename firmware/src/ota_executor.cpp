#include "ota_executor.h"
#include "config.h"
#include <HTTPClient.h>
#include <mbedtls/sha256.h>
#include <Update.h>

OTAExecutor::OTAExecutor() : _lastHashValid(false) {}

bool OTAExecutor::begin(const String& url, const String& expectedHash) {
  if (url.length() == 0) return false;

  _lastHashValid = false;
  Serial.printf("[OTA] Descargando firmware: %s\n", url.c_str());

  HTTPClient http;
  http.begin(url);
  http.setTimeout(30000);
  http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[OTA] Error HTTP %d\n", code);
    http.end();
    return false;
  }

  int totalLen = http.getSize();
  if (totalLen <= 0) {
    Serial.println("[OTA] Tamaño de firmware inválido");
    http.end();
    return false;
  }

  if (!Update.begin(totalLen, U_FLASH)) {
    Serial.printf("[OTA] Update.begin falló: %s\n", Update.errorString());
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  size_t written = 0;
  uint8_t buffer[256];

  mbedtls_sha256_context shaCtx;
  bool hashEnabled = (expectedHash.length() == 64);
  if (hashEnabled) {
    mbedtls_sha256_init(&shaCtx);
    mbedtls_sha256_starts(&shaCtx, 0);
  }

  while (http.connected() && written < totalLen) {
    size_t available = stream->available();
    if (available) {
      size_t toRead = min(available, sizeof(buffer));
      size_t read = stream->readBytes(buffer, toRead);
      size_t flushed = Update.write(buffer, read);
      if (flushed != read) {
        Serial.printf("[OTA] Error escribiendo: %s\n", Update.errorString());
        if (hashEnabled) mbedtls_sha256_free(&shaCtx);
        http.end();
        return false;
      }
      if (hashEnabled) {
        mbedtls_sha256_update(&shaCtx, buffer, read);
      }
      written += flushed;
    }
    delay(1);
  }

  http.end();

  if (written != totalLen) {
    Serial.printf("[OTA] Escritos %u de %d bytes\n", written, totalLen);
    if (hashEnabled) mbedtls_sha256_free(&shaCtx);
    Update.abort();
    return false;
  }

  if (hashEnabled) {
    uint8_t hash[32];
    mbedtls_sha256_finish(&shaCtx, hash);
    mbedtls_sha256_free(&shaCtx);

    char computedHex[65];
    for (int i = 0; i < 32; i++) {
      snprintf(computedHex + i * 2, 3, "%02x", hash[i]);
    }
    computedHex[64] = '\0';

    if (expectedHash != String(computedHex)) {
      Serial.printf("[OTA] Hash mismatch:\n  esperado: %s\n  calculado: %s\n",
        expectedHash.c_str(), computedHex);
      Update.abort();
      return false;
    }
    Serial.println("[OTA] SHA-256 verificado OK");
    _lastHashValid = true;
  } else {
    Serial.println("[OTA] Sin hash esperado — verificación omitida");
  }

  if (!Update.end()) {
    Serial.printf("[OTA] Update.end falló: %s\n", Update.errorString());
    return false;
  }

  Serial.println("[OTA] Actualización OK — reiniciando...");
  return true;
}

bool OTAExecutor::verifyLastHash() {
  return _lastHashValid;
}

void OTAExecutor::setCaCert(const char* cert) {
  (void)cert;
}
