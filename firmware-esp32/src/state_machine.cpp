#include "state_machine.h"
#include <Preferences.h>

#define REBOOT_COUNT_KEY "rebootCnt"
#define WATCHDOG_SW_TIMEOUT 30000
#define MAX_REBOOTS_BEFORE_SAFE 5

static const bool TRANSITION_MATRIX[9][9] = {
  // to:  BOOT  INIT  WIFI  NORM  DEGR  ERR   RECV  SAFE  OTA_U
  /*BOOT*/ {0,    1,    0,    0,    0,    0,    0,    0,    0},
  /*INIT*/ {0,    0,    1,    0,    0,    0,    0,    0,    0},
  /*WIFI*/ {0,    0,    0,    1,    1,    0,    0,    0,    0},
  /*NORM*/ {0,    0,    0,    0,    1,    1,    0,    0,    1},
  /*DEGR*/ {0,    0,    0,    1,    0,    1,    0,    0,    1},
  /*ERR*/  {0,    0,    0,    1,    1,    0,    1,    0,    0},
  /*RECV*/ {0,    0,    0,    1,    1,    0,    0,    0,    0},
  /*SAFE*/ {0,    1,    0,    0,    0,    0,    0,    0,    0},
  /*OTA_U*/{0,    0,    0,    0,    0,    1,    0,    0,    0},
};

StateMachine::StateMachine()
  : state(ST_BOOT), lastWatchdogFeed(0), rebootCount(0), stateEntered(0) {
  errorReason[0] = '\0';
}

void StateMachine::init() {
  loadRebootCount();
  setState(ST_INIT);
}

bool StateMachine::_isTransitionValid(DeviceState from, DeviceState to) {
  if (from < 0 || from >= _STATE_COUNT) return false;
  if (to < 0 || to >= _STATE_COUNT) return false;
  return TRANSITION_MATRIX[from][to];
}

bool StateMachine::setState(DeviceState newState) {
  return fsmTransition(newState, nullptr);
}

bool StateMachine::fsmTransition(DeviceState next, const char* reason) {
  if (next == state) return true;

  if (!_isTransitionValid(state, next)) {
    Serial.printf("[STATE] Transición inválida: %s → %s\n",
      getStateName(state), getStateName(next));
    return false;
  }

  DeviceState oldState = state;
  state = next;
  stateEntered = millis();

  if (reason) {
    Serial.printf("[STATE] %s → %s (%s)\n", getStateName(oldState), getStateName(), reason);
  } else {
    Serial.printf("[STATE] %s → %s\n", getStateName(oldState), getStateName());
  }
  return true;
}

DeviceState StateMachine::getState() {
  return state;
}

const char* StateMachine::getStateName(DeviceState s) {
  switch (s) {
    case ST_BOOT: return "BOOT";
    case ST_INIT: return "INIT";
    case ST_WIFI: return "WIFI";
    case ST_NORMAL: return "NORMAL";
    case ST_DEGRADED: return "DEGRADED";
    case ST_ERROR: return "ERROR";
    case ST_RECOVERY: return "RECOVERY";
    case ST_SAFE: return "SAFE";
    case ST_OTA_UPDATING: return "OTA_UPDATING";
    default: return "UNKNOWN";
  }
}

const char* StateMachine::getStateName() {
  return getStateName(state);
}

void StateMachine::setError(const char* reason) {
  snprintf(errorReason, sizeof(errorReason), "%s", reason);
  fsmTransition(ST_ERROR, reason);
}

const char* StateMachine::getError() {
  return errorReason;
}

void StateMachine::feedWatchdog() {
  lastWatchdogFeed = millis();
}

void StateMachine::handleWatchdog() {
  unsigned long now = millis();
  if (now - lastWatchdogFeed > WATCHDOG_SW_TIMEOUT) {
    Serial.println("[WDT] Software watchdog timeout — reiniciando");
    saveRebootCount();
    ESP.restart();
  }
}

void StateMachine::loadRebootCount() {
  Preferences prefs;
  prefs.begin(prefsNamespace, true);
  rebootCount = prefs.getUChar(REBOOT_COUNT_KEY, 0);
  prefs.end();

  if (rebootCount > 50) rebootCount = 0;

  uint8_t newCount = rebootCount + 1;
  prefs.begin(prefsNamespace, false);
  prefs.putUChar(REBOOT_COUNT_KEY, newCount);
  prefs.end();

  Serial.printf("[STATE] Boot #%d\n", newCount);
}

void StateMachine::saveRebootCount() {
  Preferences prefs;
  prefs.begin(prefsNamespace, false);
  uint8_t newCount = rebootCount + 1;
  prefs.putUChar(REBOOT_COUNT_KEY, newCount);
  prefs.end();
}

uint8_t StateMachine::getRebootCount() {
  return rebootCount;
}

bool StateMachine::isSafeMode() {
  if (rebootCount >= MAX_REBOOTS_BEFORE_SAFE) {
    fsmTransition(ST_SAFE, "max reboots exceeded");
    return true;
  }
  return false;
}
