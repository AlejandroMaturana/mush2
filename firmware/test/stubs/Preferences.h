#ifndef NATIVE_PREFERENCES_STUB_H
#define NATIVE_PREFERENCES_STUB_H
#pragma once

// Stub host-only de Preferences.h (NVS de Arduino-ESP32) para la suite nativa.
// Backing store: stubs::nvsStore() — persistencia en memoria entre begin/end,
// igual que el NVS real (los valores sobreviven a begin/end dentro de un test).

#include "Arduino.h"
#include "stubs_config.h"
#include <string.h>

class Preferences {
public:
  Preferences() : _readOnly(false), _open(false) {}

  bool begin(const char* name, bool readOnly = false) {
    _ns = name ? name : "";
    _readOnly = readOnly;
    _open = true;
    return true;
  }

  void end() {
    _open = false;
  }

  void putUChar(const char* key, uint8_t value) { _store(key, &value, sizeof(value)); }
  void putULong(const char* key, uint32_t value) { _store(key, &value, sizeof(value)); }
  void putBytes(const char* key, const void* value, size_t len) { _store(key, value, len); }
  void putString(const char* key, const String& value) { _store(key, value.c_str(), value.length() + 1); }

  uint8_t getUChar(const char* key, uint8_t def = 0) { return _getScalar<uint8_t>(key, def); }
  uint32_t getULong(const char* key, uint32_t def = 0) { return _getScalar<uint32_t>(key, def); }

  size_t getBytes(const char* key, void* buf, size_t maxLen) {
    const stubs::NvsEntry* e = _find(key);
    if (!e) return 0;
    size_t n = e->bytes.size();
    if (n > maxLen) n = maxLen;
    if (buf) memcpy(buf, e->bytes.data(), n);
    return n;
  }

  String getString(const char* key, const String& def = String()) {
    const stubs::NvsEntry* e = _find(key);
    if (!e || e->bytes.empty()) return def;
    const char* p = reinterpret_cast<const char*>(e->bytes.data());
    size_t n = strnlen(p, e->bytes.size());
    return String(std::string(p, n).c_str());
  }

  bool remove(const char* key) {
    stubs::NvsStore::mapped_type& ns = stubs::nvsStore()[_ns];
    return ns.erase(key ? key : "") > 0;
  }

  void clear() {
    stubs::nvsStore().erase(_ns);
  }

  bool isKey(const char* key) const {
    stubs::NvsStore::iterator it = stubs::nvsStore().find(_ns);
    if (it == stubs::nvsStore().end()) return false;
    return it->second.find(key ? key : "") != it->second.end();
  }

private:
  std::string _ns;
  bool _readOnly;
  bool _open;

  const stubs::NvsEntry* _find(const char* key) const {
    stubs::NvsStore::const_iterator it = stubs::nvsStore().find(_ns);
    if (it == stubs::nvsStore().end()) return nullptr;
    stubs::NvsStore::mapped_type::const_iterator kit = it->second.find(key ? key : "");
    if (kit == it->second.end()) return nullptr;
    return &kit->second;
  }

  void _store(const char* key, const void* value, size_t len) {
    const uint8_t* p = static_cast<const uint8_t*>(value);
    stubs::nvsStore()[_ns][key ? key : ""] = stubs::NvsEntry(std::vector<uint8_t>(p, p + len));
  }

  template <typename T>
  T _getScalar(const char* key, T def) {
    const stubs::NvsEntry* e = _find(key);
    if (!e || e->bytes.size() < sizeof(T)) return def;
    T v;
    memcpy(&v, e->bytes.data(), sizeof(T));
    return v;
  }
};

#endif
