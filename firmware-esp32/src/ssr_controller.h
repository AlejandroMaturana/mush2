#ifndef SSR_CONTROLLER_H
#define SSR_CONTROLLER_H

#include <Arduino.h>
#include <Preferences.h>

#define SSR_CHANNELS 4
#define SSR_NVS_NS "mush2"
#define SSR_NVS_KEY "ssr_mode"

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
  void setActiveLow(bool activeLow);
  bool getActiveLow();
  void loadFromNVS();
  void saveToNVS();

private:
  SSRChannel channels[SSR_CHANNELS];
  bool _activeLow;
  uint8_t resolvePinState(uint8_t state);
};

#endif
