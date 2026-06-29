#ifndef SSR_CONTROLLER_H
#define SSR_CONTROLLER_H

#include <Arduino.h>

#define SSR_CHANNELS 4

struct SSRChannel {
  uint8_t pin;
  uint8_t state;
  unsigned long since;
  unsigned long minOnTime;
  unsigned long maxOnTime;
};

class SSRController {
public:
  SSRController();
  void init();
  void setChannel(uint8_t channel, uint8_t state);
  uint8_t getChannel(uint8_t channel);
  void getStateArray(uint8_t* states);
  void setAll(uint8_t state);
  void loop();
  bool processCommand(uint8_t channel, const char* command, char* response, size_t responseSize);

private:
  SSRChannel channels[SSR_CHANNELS];
  uint8_t resolvePinState(uint8_t state);
};

#endif
