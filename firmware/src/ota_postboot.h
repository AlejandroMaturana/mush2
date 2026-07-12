#ifndef OTA_POSTBOOT_H
#define OTA_POSTBOOT_H

#include <Arduino.h>
#include <esp_ota_ops.h>

class StateMachine;

class OTAConfirmation {
public:
  OTAConfirmation();
  void init(StateMachine* sm);
  bool selfTest();
  void confirm();
  void rollback();
  bool isPendingVerification();

private:
  bool _otaPending;
  StateMachine* _sm;
};

#endif
