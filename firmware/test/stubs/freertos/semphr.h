#ifndef NATIVE_FREERTOS_SEMPHR_STUB_H
#define NATIVE_FREERTOS_SEMPHR_STUB_H
#pragma once

// Stub host-only de freertos/semphr.h: mutex no-op para la suite nativa.

#include "FreeRTOS.h"

typedef void* SemaphoreHandle_t;

inline SemaphoreHandle_t xSemaphoreCreateMutex() {
  static int dummy = 0;
  (void)dummy;
  return static_cast<void*>(&dummy);
}

inline BaseType_t xSemaphoreTake(SemaphoreHandle_t mutex, TickType_t xTicksToWait) {
  (void)mutex;
  (void)xTicksToWait;
  return pdTRUE;
}

inline BaseType_t xSemaphoreGive(SemaphoreHandle_t mutex) {
  (void)mutex;
  return pdTRUE;
}

#endif
