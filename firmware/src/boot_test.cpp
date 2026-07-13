#include "boot_test.h"
#include "config.h"
#include <Wire.h>
#include <SPIFFS.h>

BootTest bootTest;

void BootTest::init() {
  _resultCount = 0;
  memset(_results, 0, sizeof(_results));
}

bool BootTest::_testI2CBus() {
  Wire.beginTransmission(0x38);
  bool aht = Wire.endTransmission() == 0;

  Wire.beginTransmission(0x53);
  bool ens = Wire.endTransmission() == 0;

  return aht || ens;
}

bool BootTest::_testAHT21() {
  Wire.beginTransmission(0x38);
  return Wire.endTransmission() == 0;
}

bool BootTest::_testENS160() {
  Wire.beginTransmission(0x53);
  return Wire.endTransmission() == 0;
}

bool BootTest::_testFlash() {
  const char* testStr = "mush2_boot_test";
  char readBuf[32];
  snprintf(readBuf, sizeof(readBuf), "/boot_test_%lu.txt", millis());

  File f = SPIFFS.open(readBuf, FILE_WRITE);
  if (!f) return false;
  f.print(testStr);
  f.close();

  f = SPIFFS.open(readBuf, FILE_READ);
  if (!f) return false;
  String content = f.readString();
  f.close();
  SPIFFS.remove(readBuf);

  return content == testStr;
}

bool BootTest::_testRAM() {
  return ESP.getFreeHeap() >= 50000;
}

void BootTest::_addResult(const char* name, bool passed, bool critical) {
  if (_resultCount >= BOOT_TEST_MAX_COMPONENTS) return;
  _results[_resultCount].name = name;
  _results[_resultCount].passed = passed;
  _results[_resultCount].critical = critical;
  _resultCount++;
}

BootTestResult BootTest::run() {
  BootTestResult result;
  result.overall = true;
  result.failReason[0] = '\0';

  _resultCount = 0;

  _addResult("I2C_BUS", _testI2CBus(), true);
  result.i2cBus = _results[_resultCount - 1].passed;

  _addResult("AHT21", _testAHT21(), true);
  result.aht21 = _results[_resultCount - 1].passed;

  _addResult("ENS160", _testENS160(), false);
  result.ens160 = _results[_resultCount - 1].passed;

  _addResult("FLASH", _testFlash(), false);
  result.flash = _results[_resultCount - 1].passed;

  _addResult("RAM", _testRAM(), false);
  result.ram = _results[_resultCount - 1].passed;

  for (uint8_t i = 0; i < _resultCount; i++) {
    if (!_results[i].passed && _results[i].critical) {
      result.overall = false;
      snprintf(result.failReason, sizeof(result.failReason), "%s_FAIL", _results[i].name);
      break;
    }
  }

  Serial.println("[BOOT] === Self-test Results ===");
  for (uint8_t i = 0; i < _resultCount; i++) {
    Serial.printf("[BOOT]   %s: %s%s\n",
      _results[i].name,
      _results[i].passed ? "PASS" : "FAIL",
      _results[i].critical ? " [CRITICAL]" : "");
  }
  Serial.printf("[BOOT]   Overall: %s\n", result.overall ? "PASS" : "FAIL");
  if (!result.overall) {
    Serial.printf("[BOOT]   Reason: %s\n", result.failReason);
  }

  return result;
}

const ComponentTest* BootTest::getResults(uint8_t* count) {
  *count = _resultCount;
  return _results;
}

bool BootTest::isComponentCritical(const char* name) {
  for (uint8_t i = 0; i < _resultCount; i++) {
    if (strcmp(_results[i].name, name) == 0) {
      return _results[i].critical;
    }
  }
  return false;
}
