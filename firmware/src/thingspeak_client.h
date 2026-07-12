#ifndef THINGSPEAK_CLIENT_H
#define THINGSPEAK_CLIENT_H

#include <Arduino.h>

class ThingSpeakClient {
public:
  ThingSpeakClient();
  bool send(float temperature, float humidity, float co2 = 0, float voc = 0);

private:
  bool sendRequest(const String& url);
};

#endif
