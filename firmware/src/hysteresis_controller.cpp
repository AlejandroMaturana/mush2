#include "hysteresis_controller.h"
#include "config.h"
#include <Preferences.h>

#define HYST_NVS_NS "hysteresis"
#define HYST_NVS_KEY "setpoints"
#define HYST_NVS_SCHEMA "schema"
#define HYST_NVS_SCHEMA_VER 1

HysteresisController::HysteresisController()
  : mode(CTRL_LOCAL), heatingOn(false), ventilationOn(false), humidOn(false), lightOn(false),
    ohState(OH_NONE), postVentStart(0), postVentActive(false) {
  alarmReason[0] = '\0';
}

void HysteresisController::init(Setpoints defaultSetpoints) {
  sp = defaultSetpoints;
  mode = CTRL_LOCAL;
  heatingOn = false;
  ventilationOn = false;
  humidOn = false;
  lightOn = false;
  ohState = OH_NONE;
  postVentActive = false;
  postVentStart = 0;
}

void HysteresisController::setSetpoints(Setpoints newSp) {
  sp = newSp;
  saveSetpointsNVS();
}

Setpoints HysteresisController::getSetpoints() {
  return sp;
}

void HysteresisController::saveSetpointsNVS() {
  Preferences prefs;
  prefs.begin(HYST_NVS_NS, false);
  prefs.putUChar(HYST_NVS_SCHEMA, HYST_NVS_SCHEMA_VER);
  prefs.putBytes(HYST_NVS_KEY, &sp, sizeof(Setpoints));
  prefs.end();
}

bool HysteresisController::loadSetpointsNVS() {
  Preferences prefs;
  prefs.begin(HYST_NVS_NS, true);
  uint8_t schema = prefs.getUChar(HYST_NVS_SCHEMA, 0);
  if (schema < HYST_NVS_SCHEMA_VER) {
    prefs.end();
    return false;
  }
  size_t readLen = prefs.getBytes(HYST_NVS_KEY, &sp, sizeof(Setpoints));
  prefs.end();
  return readLen == sizeof(Setpoints);
}

void HysteresisController::setMode(CtrlMode newMode) {
  mode = newMode;
}

CtrlMode HysteresisController::getMode() {
  return mode;
}

void HysteresisController::setOverheat(float temp) {
  if (temp >= TEMP_CRITICAL) {
    if (ohState != OH_ACTIVE) {
      ohState = OH_ACTIVE;
      snprintf(alarmReason, sizeof(alarmReason), "OVERHEAT:%.1f>%.0f", temp, TEMP_CRITICAL);
    }
  } else if (temp < TEMP_RECOVERY && ohState == OH_ACTIVE) {
    ohState = OH_RECOVERY;
  }
}

OverheatState HysteresisController::getOverheatState() {
  return ohState;
}

bool HysteresisController::shouldHeat(float temp, bool ventOn) {
  if (ventOn) {
    heatingOn = false;
    return false;
  }
  if (heatingOn) {
    if (temp >= sp.tempMax) {
      heatingOn = false;
    }
  } else {
    if (temp <= sp.tempMin - HYSTERESIS_BAND_TEMP) {
      heatingOn = true;
    }
  }
  return heatingOn;
}

bool HysteresisController::shouldVentilate(float temp, uint16_t co2) {
  bool needsVent = false;

  if (temp >= sp.tempMax + 1.0) {
    needsVent = true;
  }

  if (co2 > 0 && co2 >= sp.co2Max + HYSTERESIS_BAND_CO2) {
    needsVent = true;
  }

  if (ventilationOn) {
    if (temp < sp.tempMax - 1.0 && (co2 == 0 || co2 < sp.co2Max - HYSTERESIS_BAND_CO2)) {
      needsVent = false;
    } else {
      needsVent = true;
    }
  }

  if (ventilationOn && !needsVent) {
    postVentActive = true;
    postVentStart = millis();
  }

  ventilationOn = needsVent;
  return ventilationOn;
}

bool HysteresisController::shouldHumidify(float hum, float temp, bool ventOn) {
  if (ventOn || temp >= 27.5) {
    humidOn = false;
    return false;
  }

  if (humidOn) {
    if (hum >= sp.humMax || temp >= 28.0) {
      humidOn = false;
    }
  } else {
    if (hum <= sp.humMin - HYSTERESIS_BAND_HUM && temp < 27.5) {
      humidOn = true;
    }
  }
  return humidOn;
}

bool HysteresisController::isPostVentActive() {
  if (!postVentActive) return false;
  unsigned long now = millis();
  unsigned long elapsed = now - postVentStart;

  if (elapsed >= POST_VENT_DELAY && elapsed < POST_VENT_DELAY + POST_VENT_DURATION) {
    return true;
  }

  if (elapsed >= POST_VENT_DELAY + POST_VENT_DURATION) {
    postVentActive = false;
  }
  return false;
}

void HysteresisController::resetPostVent() {
  postVentActive = false;
  postVentStart = 0;
}

void HysteresisController::setLightState(bool on) {
  lightOn = on;
}

bool HysteresisController::getLightState() {
  return lightOn;
}

void HysteresisController::checkAlarms(float temperature, float humidity, uint16_t co2) {
  if (ohState == OH_ACTIVE) return;

  if (temperature > sp.tempMax + 3.0) {
    snprintf(alarmReason, sizeof(alarmReason), "HIGH_TEMP:%.1f", temperature);
  } else if (temperature < sp.tempMin - 3.0) {
    snprintf(alarmReason, sizeof(alarmReason), "LOW_TEMP:%.1f", temperature);
  } else if (humidity > sp.humMax + 5.0) {
    snprintf(alarmReason, sizeof(alarmReason), "HIGH_HUM:%.1f", humidity);
  } else if (humidity < sp.humMin - 5.0) {
    snprintf(alarmReason, sizeof(alarmReason), "LOW_HUM:%.1f", humidity);
  } else if (co2 > 0 && co2 > sp.co2Max + 500) {
    snprintf(alarmReason, sizeof(alarmReason), "HIGH_CO2:%u", co2);
  }
}

void HysteresisController::evaluate(float temperature, float humidity, uint16_t co2, uint8_t* ssrOutputs) {
  alarmReason[0] = '\0';

  if (ohState == OH_ACTIVE) {
    ssrOutputs[0] = 0;
    ssrOutputs[1] = 1;
    ssrOutputs[2] = 0;
    ssrOutputs[3] = 0;
    return;
  }

  if (ohState == OH_RECOVERY) {
    ohState = OH_NONE;
    snprintf(alarmReason, sizeof(alarmReason), "OVERHEAT_CLEAR:%.1f", temperature);
    ventilationOn = false;
  }

  if (mode != CTRL_LOCAL) {
    ssrOutputs[0] = 0;
    ssrOutputs[1] = 0;
    ssrOutputs[2] = 0;
    ssrOutputs[3] = lightOn ? 1 : 0;
    return;
  }

  uint8_t vent = shouldVentilate(temperature, co2) ? 1 : 0;

  uint8_t heat = shouldHeat(temperature, vent == 1) ? 1 : 0;

  uint8_t humid = shouldHumidify(humidity, temperature, vent == 1) ? 1 : 0;

  if (!vent && isPostVentActive()) {
    humid = 1;
  }

  ssrOutputs[0] = heat;
  ssrOutputs[1] = vent;
  ssrOutputs[2] = humid;
  ssrOutputs[3] = lightOn ? 1 : 0;

  checkAlarms(temperature, humidity, co2);
}

const char* HysteresisController::getAlarmReason() {
  return alarmReason[0] != '\0' ? alarmReason : nullptr;
}
