#ifndef NATIVE_FREERTOS_STUB_H
#define NATIVE_FREERTOS_STUB_H
#pragma once

// Stub host-only de freertos/FreeRTOS.h: minimo necesario para logger.h,
// event_bus.h y sus implementaciones en la suite nativa.

#include <stdint.h>
#include <stddef.h>

typedef int BaseType_t;
typedef uint32_t TickType_t;

#define pdTRUE  1
#define pdFALSE 0
#define pdPASS  pdTRUE
#define pdFAIL  pdFALSE

#define portMAX_DELAY ((TickType_t)0xFFFFFFFFUL)

typedef int portMUX_TYPE;
#define portMUX_INITIALIZER_UNLOCKED 0
#define portENTER_CRITICAL(mux)   do {} while (0)
#define portEXIT_CRITICAL(mux)    do {} while (0)
#define portYIELD_FROM_ISR()      do {} while (0)

#endif
