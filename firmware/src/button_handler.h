#ifndef BUTTON_HANDLER_H
#define BUTTON_HANDLER_H

#include <Arduino.h>
#include "button_fsm.h"
#include "state_machine.h"

class ButtonHandler {
public:
  ButtonHandler();
  void init(StateMachine* sm);
  void handleGesture(ButtonGesture gesture, uint32_t holdDuration);
  void ledHoldProgress(uint32_t duration);

private:
  StateMachine* _sm;
  void _factoryReset();
};

extern ButtonHandler buttonHandler;

#endif
