#include "ota_executor.h"
#include "config.h"
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <mbedtls/sha256.h>
#include <Update.h>

// ISSUE-052 (FW-003) — OTAExecutor endurecido (ADR-014 P4/P6):
//  - Transporte SOLO por WiFiClientSecure con CA configurada (nunca setInsecure()).
//  - URL obligatoriamente https (sin fallback a texto claro).
//  - Hash SHA-256 obligatorio (64 hex) antes de descargar; sin hash se rechaza.

static char lowerHexChar(char c) {
  if (c >= 'A' && c <= 'F') return (char)(c + 32);
  return c;
}

static bool isHexDigit(char c) {
  return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

OTAExecutor::OTAExecutor() : _lastHashValid(false), _caCert(nullptr) {}

void OTAExecutor::setCaCert(const char* cert) {
  _caCert = cert;
}

bool OTAExecutor::hasCaCert() const {
  return _caCert != nullptr && _caCert[0] != '\0';
}

bool OTAExecutor::validateExpectedHash(const String& hash) const {
  if (hash.length() != 64) return false;
  for (size_t i = 0; i < 64; i++) {
    if (!isHexDigit(hash.charAt((unsigned int)i))) return false;
  }
  return true;
}

bool OTAExecutor::begin(const String& url, const String& expectedHash) {
  if (url.length() == 0) return false;

  if (!hasCaCert()) {
    Serial.println("[OTA] Rechazado: CA no configurada (ADR-014 P4)");
    return false;
  }

  if (!url.startsWith("https://")) {
    Serial.println("[OTA] Rechazado: URL debe ser https (sin fallback a texto claro)");
    return false;
  }

  if (!validateExpectedHash(expectedHash)) {
    Serial.println("[OTA] Rechazado: hash SHA-256 obligatorio (64 hex)");
    return false;
  }

  _lastHashValid = false;
  Serial.printf("[OTA] Descargando firmware: %s\n", url.c_str());

  WiFiClientSecure secureClient;
  secureClient.setCACert(_caCert);

  HTTPClient http;
  http.begin(secureClient, url);
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
  mbedtls_sha256_init(&shaCtx);
  mbedtls_sha256_starts(&shaCtx, 0);

  while (http.connected() && written < totalLen) {
    size_t available = stream->available();
    if (available) {
      size_t toRead = min(available, sizeof(buffer));
      size_t read = stream->readBytes(buffer, toRead);
      size_t flushed = Update.write(buffer, read);
      if (flushed != read) {
        Serial.printf("[OTA] Error escribiendo: %s\n", Update.errorString());
        mbedtls_sha256_free(&shaCtx);
        http.end();
        return false;
      }
      mbedtls_sha256_update(&shaCtx, buffer, read);
      written += flushed;
    }
    delay(1);
  }

  http.end();

  if (written != totalLen) {
    Serial.printf("[OTA] Escritos %u de %d bytes\n", written, totalLen);
    mbedtls_sha256_free(&shaCtx);
    Update.abort();
    return false;
  }

  uint8_t hash[32];
  mbedtls_sha256_finish(&shaCtx, hash);
  mbedtls_sha256_free(&shaCtx);

  char computedHex[65];
  for (int i = 0; i < 32; i++) {
    snprintf(computedHex + i * 2, 3, "%02x", (unsigned int)hash[i]);
  }
  computedHex[64] = '\0';

  bool hashMatch = true;
  for (size_t i = 0; i < 64; i++) {
    if (lowerHexChar(expectedHash.charAt((unsigned int)i)) != computedHex[i]) {
      hashMatch = false;
      break;
    }
  }

  if (!hashMatch) {
    Serial.printf("[OTA] Hash mismatch:\n  esperado: %s\n  calculado: %s\n",
      expectedHash.c_str(), computedHex);
    Update.abort();
    return false;
  }
  Serial.println("[OTA] SHA-256 verificado OK");
  _lastHashValid = true;

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
