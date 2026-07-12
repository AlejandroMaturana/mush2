#ifndef OTA_SHUTDOWN_H
#define OTA_SHUTDOWN_H

#include <Arduino.h>

class SSRController;

class OTAShutdown {
public:
  OTAShutdown();
  void init(SSRController* ssr);
  bool begin();
  void abortRollback();
private:
  SSRController* _ssr;
};

#endif
