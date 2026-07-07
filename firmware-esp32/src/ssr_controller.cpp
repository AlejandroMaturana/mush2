#include "ssr_controller.h"
#include "config.h"

SSRController::SSRController() : _activeLow(true) {
  uint8_t pins[4] = {SSR_CH1_PIN, SSR_CH2_PIN, SSR_CH3_PIN, SSR_CH4_PIN};
  for (int i = 0; i < SSR_CHANNELS; i++) {
    channels[i].pin = pins[i];
    channels[i].state = 0;
    channels[i].since = 0;
    channels[i].minOnTime = 3000;
    channels[i].maxOnTime = 0;
  }
  loadFromNVS();
}

void SSRController::init() {
  for (int i = 0; i < SSR_CHANNELS; i++) {
    pinMode(channels[i].pin, OUTPUT);
    digitalWrite(channels[i].pin, resolvePinState(0));
    channels[i].state = 0;
    channels[i].since = millis();
  }
}

uint8_t SSRController::resolvePinState(uint8_t state) {
  if (_activeLow) {
    return state ? LOW : HIGH;
  } else {
    return state ? HIGH : LOW;
  }
}

void SSRController::setChannel(uint8_t channel, uint8_t state) {
  if (channel < 1 || channel > SSR_CHANNELS) return;
  uint8_t idx = channel - 1;

  if (state == channels[idx].state) return;

  channels[idx].state = state;
  channels[idx].since = millis();
  digitalWrite(channels[idx].pin, resolvePinState(state));
}

uint8_t SSRController::getChannel(uint8_t channel) {
  if (channel < 1 || channel > SSR_CHANNELS) return 0;
  return channels[channel - 1].state;
}

void SSRController::getStateArray(uint8_t* states) {
  for (int i = 0; i < SSR_CHANNELS; i++) {
    states[i] = channels[i].state;
  }
}

void SSRController::setAll(uint8_t state) {
  for (int i = 0; i < SSR_CHANNELS; i++) {
    setChannel(i + 1, state);
  }
}

void SSRController::loop() {
  unsigned long now = millis();
  for (int i = 0; i < SSR_CHANNELS; i++) {
    if (channels[i].state == 1 && channels[i].maxOnTime > 0) {
      if (now - channels[i].since >= channels[i].maxOnTime) {
        setChannel(i + 1, 0);
        Serial.printf("[SSR] Canal %d apagado por maxOnTime\n", i + 1);
      }
    }
  }
}

bool SSRController::processCommand(uint8_t channel, const char* command, char* response, size_t responseSize) {
  if (channel < 1 || channel > SSR_CHANNELS) {
    snprintf(response, responseSize, "INVALID_CHANNEL");
    return false;
  }

  if (strcmp(command, "ON") == 0) {
    unsigned long now = millis();
    uint8_t idx = channel - 1;

    if (channels[idx].state == 0 && channels[idx].minOnTime > 0) {
      if (now - channels[idx].since < channels[idx].minOnTime && channels[idx].since > 0) {
        snprintf(response, responseSize, "BUSY");
        return false;
      }
    }

    setChannel(channel, 1);
    snprintf(response, responseSize, "OK");
    return true;
  }

  if (strcmp(command, "OFF") == 0) {
    setChannel(channel, 0);
    snprintf(response, responseSize, "OK");
    return true;
  }

  snprintf(response, responseSize, "INVALID_STATE");
  return false;
}

void SSRController::setActiveLow(bool activeLow) {
  if (_activeLow == activeLow) return;
  _activeLow = activeLow;
  saveToNVS();
  for (int i = 0; i < SSR_CHANNELS; i++) {
    digitalWrite(channels[i].pin, resolvePinState(channels[i].state));
  }
}

bool SSRController::getActiveLow() {
  return _activeLow;
}

void SSRController::loadFromNVS() {
  Preferences prefs;
  prefs.begin(SSR_NVS_NS, true);
  _activeLow = prefs.getBool(SSR_NVS_KEY, true);
  prefs.end();
  Serial.printf("[SSR] Modo cargado desde NVS: active-%s\n", _activeLow ? "LOW" : "HIGH");
}

void SSRController::saveToNVS() {
  Preferences prefs;
  prefs.begin(SSR_NVS_NS, false);
  prefs.putBool(SSR_NVS_KEY, _activeLow);
  prefs.end();
  Serial.printf("[SSR] Modo guardado en NVS: active-%s\n", _activeLow ? "LOW" : "HIGH");
}
