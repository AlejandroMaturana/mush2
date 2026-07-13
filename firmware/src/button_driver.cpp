#include "button_driver.h"
#include "config.h"

ButtonDriver buttonDriver;

ButtonDriver::ButtonDriver()
  : _pin(-1), _edgeFlag(false), _lastEdgeTime(0) {}

void ButtonDriver::init(int pin) {
  _pin = pin;
  pinMode(_pin, INPUT_PULLUP);
  attachInterruptArg(digitalPinToInterrupt(_pin), _isrHandler, this, CHANGE);
  Serial.printf("[BUTTON] Driver init GPIO%d (pull-up, CHANGE)\n", _pin);
}

bool ButtonDriver::edgeDetected() {
  if (_edgeFlag) {
    _edgeFlag = false;
    return true;
  }
  return false;
}

bool ButtonDriver::isPressed() {
  return _pin >= 0 && digitalRead(_pin) == LOW;
}

void IRAM_ATTR ButtonDriver::_isrHandler(void* arg) {
  ButtonDriver* self = static_cast<ButtonDriver*>(arg);
  unsigned long now = millis();
  if (now - self->_lastEdgeTime >= BUTTON_DEBOUNCE_MS) {
    self->_edgeFlag = true;
    self->_lastEdgeTime = now;
  }
}
