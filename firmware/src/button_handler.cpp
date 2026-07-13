#include "button_handler.h"
#include "config.h"
#include <Preferences.h>

void setLEDColor(uint8_t r, uint8_t g, uint8_t b);

ButtonHandler buttonHandler;

ButtonHandler::ButtonHandler() : _sm(nullptr) {}

void ButtonHandler::init(StateMachine* sm) {
  _sm = sm;
  Serial.println("[BUTTON] Handler initialized");
}

void ButtonHandler::handleGesture(ButtonGesture gesture, uint32_t holdDuration) {
  if (!_sm) return;

  DeviceState state = _sm->getState();
  if (state == ST_OTA_UPDATING) return;

  switch (gesture) {
    case BTN_CLICK:
      switch (state) {
        case ST_NORMAL:
        case ST_DEGRADED:
          setLEDColor(200, 200, 200);
          vTaskDelay(pdMS_TO_TICKS(50));
          setLEDColor(0, 0, 0);
          Serial.println("[BUTTON] Click — LED flash");
          break;
        case ST_ERROR:
          Serial.printf("[BUTTON] Click — error: %s\n", _sm->getError());
          setLEDColor(255, 0, 0);
          vTaskDelay(pdMS_TO_TICKS(200));
          setLEDColor(255, 100, 0);
          vTaskDelay(pdMS_TO_TICKS(200));
          setLEDColor(255, 0, 0);
          vTaskDelay(pdMS_TO_TICKS(200));
          setLEDColor(0, 0, 0);
          break;
        case ST_PROVISIONING:
          Serial.println("[BUTTON] Click — cancel provisioning");
          setLEDColor(0, 0, 0);
          break;
        default:
          break;
      }
      break;

    case BTN_DOUBLE_CLICK:
      switch (state) {
        case ST_NORMAL:
        case ST_DEGRADED:
          Serial.println("[BUTTON] Double-click — sensor refresh");
          for (int i = 0; i < 2; i++) {
            setLEDColor(0, 200, 200);
            vTaskDelay(pdMS_TO_TICKS(80));
            setLEDColor(0, 0, 0);
            vTaskDelay(pdMS_TO_TICKS(80));
          }
          break;
        default:
          break;
      }
      break;

    case BTN_HOLD_3S:
      switch (state) {
        case ST_NORMAL:
        case ST_DEGRADED:
          Serial.println("[BUTTON] Hold 3s — entering provisioning");
          setLEDColor(0, 0, 255);
          vTaskDelay(pdMS_TO_TICKS(100));
          setLEDColor(0, 0, 0);
          vTaskDelay(pdMS_TO_TICKS(100));
          setLEDColor(0, 0, 255);
          vTaskDelay(pdMS_TO_TICKS(100));
          setLEDColor(0, 0, 0);
          break;
        case ST_PROVISIONING:
          Serial.println("[BUTTON] Hold 3s — cancel provisioning");
          setLEDColor(0, 0, 0);
          break;
        default:
          break;
      }
      break;

    case BTN_HOLD_10S:
      Serial.println("[BUTTON] Hold 10s — FACTORY RESET");
      for (int i = 0; i < 5; i++) {
        setLEDColor(255, 0, 0);
        vTaskDelay(pdMS_TO_TICKS(100));
        setLEDColor(0, 0, 0);
        vTaskDelay(pdMS_TO_TICKS(100));
      }
      _factoryReset();
      break;

    default:
      break;
  }
}

void ButtonHandler::ledHoldProgress(uint32_t duration) {
  if (duration < BUTTON_HOLD_3S_MS) {
    uint8_t brightness = map(duration, 0, BUTTON_HOLD_3S_MS, 0, 128);
    setLEDColor(0, 0, brightness);
  } else if (duration < BUTTON_HOLD_10S_MS) {
    uint8_t brightness = map(duration, BUTTON_HOLD_3S_MS, BUTTON_HOLD_10S_MS, 0, 255);
    setLEDColor(brightness, 0, 0);
  } else {
    setLEDColor(255, 0, 0);
  }
}

void ButtonHandler::_factoryReset() {
  Preferences prefs;
  prefs.begin("mush2", false);
  prefs.clear();
  prefs.end();
  Serial.println("[BUTTON] NVS wiped — restarting");
  delay(500);
  ESP.restart();
}
