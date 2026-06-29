#include "state_machine.h"
#include <Preferences.h>

#define REBOOT_COUNT_KEY "rebootCnt"
#define WATCHDOG_SW_TIMEOUT 30000
#define MAX_REBOOTS_BEFORE_SAFE 5

StateMachine::StateMachine()
  : state(ST_BOOT), lastWatchdogFeed(0), rebootCount(0), stateEntered(0) {
  errorReason[0] = '\0';
}

void StateMachine::init() {
  loadRebootCount();
  setState(ST_INIT);
}

void StateMachine::setState(DeviceState newState) {
  if (newState == state) return;
  DeviceState oldState = state;
  state = newState;
  stateEntered = millis();
  Serial.printf("[STATE] %s → %s\n", getStateName(oldState), getStateName());
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
    default: return "UNKNOWN";
  }
}

const char* StateMachine::getStateName() {
  return getStateName(state);
}

void StateMachine::setError(const char* reason) {
  snprintf(errorReason, sizeof(errorReason), "%s", reason);
  setState(ST_ERROR);
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
    setState(ST_SAFE);
    return true;
  }
  return false;
}
