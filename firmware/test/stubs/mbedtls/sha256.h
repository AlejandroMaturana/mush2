#ifndef NATIVE_MBEDTLS_SHA256_STUB_H
#define NATIVE_MBEDTLS_SHA256_STUB_H
#pragma once

// Stub host-only de mbedtls/sha256.h para la suite nativa
// (pio test -c platformio.test.ini). NO se usa en el build de dispositivo.
// Solo declara la API que ota_executor.cpp necesita compilar; en host el
// hash nunca se computa (la descarga OTA no se ejecuta).

#include <stdint.h>
#include <stddef.h>

typedef struct {
  uint32_t state[8];
} mbedtls_sha256_context;

static inline void mbedtls_sha256_init(mbedtls_sha256_context* ctx) { (void)ctx; }
static inline void mbedtls_sha256_starts(mbedtls_sha256_context* ctx, int is224) { (void)ctx; (void)is224; }
static inline void mbedtls_sha256_update(mbedtls_sha256_context* ctx, const unsigned char* input, size_t ilen) { (void)ctx; (void)input; (void)ilen; }
static inline void mbedtls_sha256_finish(mbedtls_sha256_context* ctx, unsigned char* output) { (void)ctx; (void)output; }
static inline void mbedtls_sha256_free(mbedtls_sha256_context* ctx) { (void)ctx; }

#endif // NATIVE_MBEDTLS_SHA256_STUB_H
