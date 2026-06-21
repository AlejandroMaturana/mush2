#include "hysteresis_controller.h"

HysteresisController::HysteresisController()
  : mode(CTRL_LOCAL), heatingOn(false), ventilationOn(false), humidOn(false) {
  alarmReason[0] = '\0';
}

void HysteresisController::init(Setpoints defaultSetpoints) {
  sp = defaultSetpoints;
  mode = CTRL_LOCAL;
  heatingOn = false;
  ventilationOn = false;
  humidOn = false;
}

void HysteresisController::setSetpoints(Setpoints newSp) {
  sp = newSp;
}

Setpoints HysteresisController::getSetpoints() {
  return sp;
}

void HysteresisController::setMode(CtrlMode newMode) {
  mode = newMode;
}

CtrlMode HysteresisController::getMode() {
  return mode;
}

bool HysteresisController::shouldHeat(float temp) {
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

  ventilationOn = needsVent;
  return ventilationOn;
}

bool HysteresisController::shouldHumidify(float hum) {
  if (humidOn) {
    if (hum >= sp.humMax) {
      humidOn = false;
    }
  } else {
    if (hum <= sp.humMin - HYSTERESIS_BAND_HUM) {
      humidOn = true;
    }
  }
  return humidOn;
}

void HysteresisController::evaluate(float temperature, float humidity, uint16_t co2, uint8_t* ssrOutputs) {
  alarmReason[0] = '\0';

  if (mode != CTRL_LOCAL) {
    ssrOutputs[0] = 0;
    ssrOutputs[1] = 0;
    ssrOutputs[2] = 0;
    ssrOutputs[3] = 0;
    return;
  }

  uint8_t heat = shouldHeat(temperature) ? 1 : 0;
  uint8_t vent = shouldVentilate(temperature, co2) ? 1 : 0;
  uint8_t humid = shouldHumidify(humidity) ? 1 : 0;

  ssrOutputs[0] = heat;     // → CH2 Calefacción
  ssrOutputs[1] = vent;     // → CH1 Ventilación
  ssrOutputs[2] = humid;    // → CH3 Humidificación
  ssrOutputs[3] = humid;    // → CH4 Humidificación

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

const char* HysteresisController::getAlarmReason() {
  return alarmReason[0] != '\0' ? alarmReason : nullptr;
}
