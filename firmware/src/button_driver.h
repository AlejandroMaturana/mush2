#ifndef BUTTON_DRIVER_H
#define BUTTON_DRIVER_H

#include <Arduino.h>

class ButtonDriver {
public:
  ButtonDriver();
  void init(int pin);
  bool edgeDetected();
  bool isPressed();

private:
  int _pin;
  volatile bool _edgeFlag;
  unsigned long _lastEdgeTime;
  static void IRAM_ATTR _isrHandler(void* arg);
};

extern ButtonDriver buttonDriver;

#endif
