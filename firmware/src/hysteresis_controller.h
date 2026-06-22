#ifndef HYSTERESIS_CONTROLLER_H
#define HYSTERESIS_CONTROLLER_H

#include <Arduino.h>

#define HYSTERESIS_BAND_TEMP 1.0
#define HYSTERESIS_BAND_HUM 7.0
#define HYSTERESIS_BAND_CO2 100

struct Setpoints {
  float tempMin;
  float tempMax;
  float humMin;
  float humMax;
  uint16_t co2Max;
};

enum CtrlMode { CTRL_LOCAL, CTRL_REMOTE, CTRL_OFF };
enum OverheatState { OH_NONE, OH_ACTIVE, OH_RECOVERY };

class HysteresisController {
public:
  HysteresisController();
  void init(Setpoints defaultSetpoints);
  void setSetpoints(Setpoints sp);
  Setpoints getSetpoints();
  void setMode(CtrlMode mode);
  CtrlMode getMode();
  void evaluate(float temperature, float humidity, uint16_t co2, uint8_t* ssrOutputs);
  const char* getAlarmReason();

  void setOverheat(float temp);
  OverheatState getOverheatState();
  bool isPostVentActive();
  void resetPostVent();
  void setLightState(bool on);
  bool getLightState();

private:
  Setpoints sp;
  CtrlMode mode;
  bool heatingOn;
  bool ventilationOn;
  bool humidOn;
  bool lightOn;
  char alarmReason[32];
  OverheatState ohState;
  unsigned long postVentStart;
  bool postVentActive;

  bool shouldHeat(float temp, bool ventOn);
  bool shouldVentilate(float temp, uint16_t co2);
  bool shouldHumidify(float hum, float temp, bool ventOn);
  void checkAlarms(float temperature, float humidity, uint16_t co2);
};

#endif
