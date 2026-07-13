#ifndef BUTTON_FSM_H
#define BUTTON_FSM_H

#include <Arduino.h>

enum ButtonGesture {
  BTN_NONE = 0,
  BTN_CLICK,
  BTN_DOUBLE_CLICK,
  BTN_HOLD_3S,
  BTN_HOLD_10S,
};

enum ButtonFsmState {
  BFSM_IDLE,
  BFSM_PRESSED,
  BFSM_HOLD_3S_REACHED,
  BFSM_HOLD_10S_REACHED,
  BFSM_WAIT_SECOND_PRESS,
};

class ButtonFsm {
public:
  ButtonFsm();
  void init();
  void loop();
  ButtonGesture getGesture();
  bool isHolding();
  uint32_t getHoldDuration();

private:
  ButtonFsmState _state;
  unsigned long _pressStart;
  unsigned long _releaseTime;
  bool _hold3sFired;
  bool _hold10sFired;
  ButtonGesture _pendingGesture;

  void _reset();
};

extern ButtonFsm buttonFsm;

#endif
