#ifndef NATIVE_ESP_TIMER_STUB_H
#define NATIVE_ESP_TIMER_STUB_H
#pragma once

// Stub host-only de esp_timer.h (Arduino-ESP32): microsegundos controlables.

#include <stdint.h>
#include "stubs_config.h"

inline int64_t esp_timer_get_time() {
  return stubs::espTimerUs();
}

#endif
