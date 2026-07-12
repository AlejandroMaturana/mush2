#include "actuator_nvs.h"
#include <esp_timer.h>

void actuatorNVSInit() {
  Preferences prefs;
  prefs.begin(ACTUATOR_NVS_NS, true);
  uint8_t schema = prefs.getUChar(ACTUATOR_NVS_SCHEMA_KEY, 0);
  prefs.end();

  if (schema < ACTUATOR_NVS_SCHEMA_VER) {
    prefs.begin(ACTUATOR_NVS_NS, false);
    prefs.putUChar(ACTUATOR_NVS_SCHEMA_KEY, ACTUATOR_NVS_SCHEMA_VER);

    uint32_t defaultHold[ACTUATOR_CHANNELS] = {
      ACTUATOR_HOLD_WINDOW_MS,
      ACTUATOR_HOLD_WINDOW_MS,
      ACTUATOR_HOLD_WINDOW_MS,
      ACTUATOR_HOLD_WINDOW_MS,
    };
    prefs.putBytes(ACTUATOR_NVS_KEY_HOLD, defaultHold, sizeof(defaultHold));

    ActuatorPersistedData blank = {};
    prefs.putBytes(ACTUATOR_NVS_KEY_STATE, &blank, sizeof(blank));
    prefs.putULong(ACTUATOR_NVS_KEY_TS, 0);

    prefs.end();
    Serial.println("[ACTNVS] Schema inicializado");
  }
}

bool actuatorNVSLoad(ActuatorPersistedData* data, uint32_t* timestamp) {
  Preferences prefs;
  prefs.begin(ACTUATOR_NVS_NS, true);

  size_t readLen = prefs.getBytes(ACTUATOR_NVS_KEY_STATE, data, sizeof(ActuatorPersistedData));
  *timestamp = prefs.getULong(ACTUATOR_NVS_KEY_TS, 0);

  prefs.end();

  return readLen == sizeof(ActuatorPersistedData);
}

void actuatorNVSSave(const ActuatorPersistedData* data) {
  Preferences prefs;
  prefs.begin(ACTUATOR_NVS_NS, false);
  prefs.putBytes(ACTUATOR_NVS_KEY_STATE, data, sizeof(ActuatorPersistedData));
  prefs.putULong(ACTUATOR_NVS_KEY_TS, (uint32_t)(esp_timer_get_time() / 1000));
  prefs.end();
}

void actuatorNVSLoadHoldWindow(uint32_t* holdWindow) {
  Preferences prefs;
  prefs.begin(ACTUATOR_NVS_NS, true);

  size_t readLen = prefs.getBytes(ACTUATOR_NVS_KEY_HOLD, holdWindow, sizeof(uint32_t) * ACTUATOR_CHANNELS);
  if (readLen != sizeof(uint32_t) * ACTUATOR_CHANNELS) {
    for (int i = 0; i < ACTUATOR_CHANNELS; i++) {
      holdWindow[i] = ACTUATOR_HOLD_WINDOW_MS;
    }
  }

  prefs.end();
}

void actuatorNVSSaveHoldWindow(const uint32_t* holdWindow) {
  Preferences prefs;
  prefs.begin(ACTUATOR_NVS_NS, false);
  prefs.putBytes(ACTUATOR_NVS_KEY_HOLD, holdWindow, sizeof(uint32_t) * ACTUATOR_CHANNELS);
  prefs.end();
}
