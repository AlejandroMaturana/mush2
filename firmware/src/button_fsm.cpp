#include "button_fsm.h"
#include "button_driver.h"
#include "config.h"

ButtonFsm buttonFsm;

ButtonFsm::ButtonFsm()
  : _state(BFSM_IDLE), _pressStart(0), _releaseTime(0),
    _hold3sFired(false), _hold10sFired(false), _pendingGesture(BTN_NONE) {}

void ButtonFsm::init() {
  _state = BFSM_IDLE;
  Serial.println("[BUTTON] FSM initialized");
}

void ButtonFsm::loop() {
  bool edge = buttonDriver.edgeDetected();
  bool pressed = buttonDriver.isPressed();
  unsigned long now = millis();

  switch (_state) {
    case BFSM_IDLE:
      if (edge && pressed) {
        _pressStart = now;
        _hold3sFired = false;
        _hold10sFired = false;
        _state = BFSM_PRESSED;
      }
      break;

    case BFSM_PRESSED:
      if (edge && !pressed) {
        unsigned long held = now - _pressStart;
        if (held < BUTTON_CLICK_MAX_MS) {
          _releaseTime = now;
          _state = BFSM_WAIT_SECOND_PRESS;
        } else {
          _reset();
        }
      } else if (!edge && !_hold3sFired && (now - _pressStart >= BUTTON_HOLD_3S_MS)) {
        _hold3sFired = true;
        _pendingGesture = BTN_HOLD_3S;
        _state = BFSM_HOLD_3S_REACHED;
      }
      break;

    case BFSM_HOLD_3S_REACHED:
      if (edge && !pressed) {
        _reset();
      } else if (!edge && !_hold10sFired && (now - _pressStart >= BUTTON_HOLD_10S_MS)) {
        _hold10sFired = true;
        _pendingGesture = BTN_HOLD_10S;
        _state = BFSM_HOLD_10S_REACHED;
      }
      break;

    case BFSM_HOLD_10S_REACHED:
      if (edge && !pressed) {
        _reset();
      }
      break;

    case BFSM_WAIT_SECOND_PRESS:
      if (edge && pressed) {
        _pendingGesture = BTN_DOUBLE_CLICK;
        _state = BFSM_PRESSED;
        _hold3sFired = true;
        _hold10sFired = true;
      } else if ((now - _releaseTime) > BUTTON_DOUBLE_GAP_MS) {
        _pendingGesture = BTN_CLICK;
        _reset();
      }
      break;
  }
}

ButtonGesture ButtonFsm::getGesture() {
  ButtonGesture g = _pendingGesture;
  _pendingGesture = BTN_NONE;
  return g;
}

bool ButtonFsm::isHolding() {
  return _state == BFSM_PRESSED || _state == BFSM_HOLD_3S_REACHED;
}

uint32_t ButtonFsm::getHoldDuration() {
  if (_state == BFSM_IDLE || _state == BFSM_WAIT_SECOND_PRESS) return 0;
  return millis() - _pressStart;
}

void ButtonFsm::_reset() {
  _state = BFSM_IDLE;
  _hold3sFired = false;
  _hold10sFired = false;
}
