#ifndef BOOT_TEST_H
#define BOOT_TEST_H

#include <Arduino.h>

#define BOOT_TEST_MAX_COMPONENTS 8

struct BootTestResult {
  bool i2cBus;
  bool aht21;
  bool ens160;
  bool wifi;
  bool flash;
  bool ram;
  bool overall;
  char failReason[64];
};

struct ComponentTest {
  const char* name;
  bool passed;
  bool critical;
};

class BootTest {
public:
  void init();
  BootTestResult run();
  const ComponentTest* getResults(uint8_t* count);
  bool isComponentCritical(const char* name);

private:
  ComponentTest _results[BOOT_TEST_MAX_COMPONENTS];
  uint8_t _resultCount;

  bool _testI2CBus();
  bool _testAHT21();
  bool _testENS160();
  bool _testFlash();
  bool _testRAM();

  void _addResult(const char* name, bool passed, bool critical);
};

extern BootTest bootTest;

#endif
