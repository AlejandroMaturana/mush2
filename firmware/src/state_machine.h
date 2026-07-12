#ifndef STATE_MACHINE_H
#define STATE_MACHINE_H

#include <Arduino.h>

enum DeviceState {
  ST_BOOT,
  ST_INIT,
  ST_WIFI,
  ST_NORMAL,
  ST_DEGRADED,
  ST_ERROR,
  ST_RECOVERY,
  ST_SAFE,
  ST_OTA_UPDATING,
  ST_PROVISIONING,
};

class StateMachine {
public:
  StateMachine();
  void init();
  bool setState(DeviceState newState);
  DeviceState getState();
  const char* getStateName();
  const char* getStateName(DeviceState s);
  bool fsmTransition(DeviceState next, const char* reason = nullptr);
  void setError(const char* reason);
  const char* getError();

  void feedWatchdog();
  void handleWatchdog();

  void loadRebootCount();
  void saveRebootCount();
  uint8_t getRebootCount();
  bool isSafeMode();

private:
  DeviceState state;
  char errorReason[32];
  unsigned long lastWatchdogFeed;
  uint8_t rebootCount;
  unsigned long stateEntered;

  const char* prefsNamespace = "mush2";

  static const int _STATE_COUNT = 10;
  bool _isTransitionValid(DeviceState from, DeviceState to);
};

#endif
