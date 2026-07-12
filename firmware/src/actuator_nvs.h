#ifndef ACTUATOR_NVS_H
#define ACTUATOR_NVS_H

#include <Arduino.h>
#include <Preferences.h>

#define ACTUATOR_NVS_NS "actuators"
#define ACTUATOR_NVS_KEY_STATE "state"
#define ACTUATOR_NVS_KEY_TS "ts"
#define ACTUATOR_NVS_KEY_HOLD "hold_win"
#define ACTUATOR_NVS_SCHEMA_KEY "schema"
#define ACTUATOR_NVS_SCHEMA_VER 1

#ifndef ACTUATOR_HOLD_WINDOW_MS
#define ACTUATOR_HOLD_WINDOW_MS 300000UL
#endif

#define ACTUATOR_CHANNELS 4

struct ActuatorPersistedData {
  uint8_t desired[ACTUATOR_CHANNELS];
  uint8_t mode[ACTUATOR_CHANNELS];
};

void actuatorNVSInit();
bool actuatorNVSLoad(ActuatorPersistedData* data, uint32_t* timestamp);
void actuatorNVSSave(const ActuatorPersistedData* data);
void actuatorNVSLoadHoldWindow(uint32_t* holdWindow);
void actuatorNVSSaveHoldWindow(const uint32_t* holdWindow);

#endif
