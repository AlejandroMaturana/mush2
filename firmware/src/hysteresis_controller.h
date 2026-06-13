#ifndef HYSTERESIS_CONTROLLER_H
#define HYSTERESIS_CONTROLLER_H

#include <Arduino.h>

#define HYSTERESIS_BAND_TEMP 1.0
#define HYSTERESIS_BAND_HUM 3.0
#define HYSTERESIS_BAND_CO2 100

struct Setpoints {
  float tempMin;
  float tempMax;
  float humMin;
  float humMax;
  uint16_t co2Max;
};

enum CtrlMode { CTRL_LOCAL, CTRL_REMOTE, CTRL_OFF };

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

private:
  Setpoints sp;
  CtrlMode mode;
  bool heatingOn;
  bool ventilationOn;
  bool humidOn;
  char alarmReason[32];

  bool shouldHeat(float temp);
  bool shouldVentilate(float temp, uint16_t co2);
  bool shouldHumidify(float hum);
};

#endif
