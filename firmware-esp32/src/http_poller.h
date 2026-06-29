#ifndef HTTP_POLLER_H
#define HTTP_POLLER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>

#define ACTUATOR_CHANNELS 4

enum PollState {
  POLL_IDLE,
  POLL_CONNECT,
  POLL_SEND,
  POLL_WAIT,
  POLL_READ,
  POLL_PARSE
};

struct ActuatorDesired {
  uint8_t state;
  uint8_t mode;
};

class HTTPPoller {
public:
  HTTPPoller();
  void init(const char* deviceId, const char* host, uint16_t port);
  void loop();
  bool isConnected();
  void getDesired(int ch, uint8_t* state, uint8_t* mode);
  unsigned int getFailCount() { return failCount; }

private:
  WiFiClient client;
  String deviceId;
  String host;
  uint16_t port;
  unsigned long lastPoll;
  unsigned int pollInterval;
  unsigned int failBackoff;
  bool lastPollOk;
  unsigned int failCount;
  ActuatorDesired desired[ACTUATOR_CHANNELS];

  PollState pollState;
  unsigned long pollDeadline;
  String httpResponse;
  bool bodyStarted;
  char hdrBuf[4];

  void beginRequest();
  void runConnect();
  void runSend();
  void runWait();
  void runRead();
  void runParse();
  void applyActuators(JsonArray actuators);
};

#endif
