#ifndef STUBS_CONFIG_H
#define STUBS_CONFIG_H

// Estado global compartido por los stubs host-only (pio test -c platformio.test.ini).
// Un solo binario nativo: el estado se comparte entre todos los test_*.cpp.
// set_up/tear_down (test_main.cpp) llama a stubs::resetAll() para aislar cada test.

#include <stdint.h>
#include <stddef.h>
#include <map>
#include <string>
#include <vector>

namespace stubs {

// millis() controlable por los tests (Arduino.h lo consume).
inline unsigned long& millisValue() {
  static unsigned long v = 0;
  return v;
}

// esp_timer_get_time() en microsegundos, controlable (actuator_nvs).
inline int64_t& espTimerUs() {
  static int64_t v = 0;
  return v;
}

// NVS en memoria: namespace -> key -> bytes crudos (semantica de Preferences).
struct NvsEntry {
  std::vector<uint8_t> bytes;
  NvsEntry() {}
  explicit NvsEntry(const std::vector<uint8_t>& b) : bytes(b) {}
};
typedef std::map<std::string, std::map<std::string, NvsEntry> > NvsStore;
typedef std::map<std::string, std::vector<uint8_t> > FsStore;

inline NvsStore& nvsStore() {
  static NvsStore s;
  return s;
}

// Filesystem plano en memoria: path -> bytes (stub de SPIFFS).
inline FsStore& fsStore() {
  static FsStore s;
  return s;
}

// SPIFFS.begin() devuelve este flag (permite simular SPIFFS no disponible).
inline bool& spiffsEnabled() {
  static bool e = true;
  return e;
}

inline void resetAll() {
  millisValue() = 0;
  espTimerUs() = 0;
  nvsStore().clear();
  fsStore().clear();
  spiffsEnabled() = true;
}

}  // namespace stubs

#endif
