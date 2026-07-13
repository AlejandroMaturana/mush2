#ifndef PREDICTIVE_MAINTENANCE_H
#define PREDICTIVE_MAINTENANCE_H

#include <Arduino.h>

#define MAINT_COMPONENTS 4
#define MAINT_HISTORY_SIZE 10
#define MAINT_RESPONSE_WINDOW_MS 300000

enum MaintComponent {
  MAINT_VENT = 0,
  MAINT_HEATER = 1,
  MAINT_HUMIDIFIER = 2,
  MAINT_LIGHT = 3,
};

struct ActuatorMetrics {
  uint32_t totalOnTime;
  uint32_t totalOffTime;
  uint32_t cycleCount;
  uint32_t lastOnTimestamp;
  uint32_t lastOffTimestamp;
  float avgResponseTime;
  float responseTimeHistory[MAINT_HISTORY_SIZE];
  uint8_t responseTimeIndex;
  uint8_t responseTimeCount;
  bool active;
  bool degraded;
  char reason[64];
};

struct MaintenanceReport {
  char component[16];
  uint8_t health;
  uint32_t estimatedFailure;
  char reason[64];
};

class PredictiveMaintenance {
public:
  void init();
  void onActuatorChange(uint8_t channel, bool isOn, unsigned long timestamp);
  void onSensorReading(float temp, float hum, uint16_t co2, unsigned long timestamp);
  void evaluate();
  uint8_t getReport(MaintenanceReport* reports, uint8_t maxReports);
  bool isDegraded(uint8_t channel);
  const char* getDegradationReason(uint8_t channel);

private:
  ActuatorMetrics _metrics[MAINT_COMPONENTS];
  float _lastTemp;
  float _lastHum;
  uint16_t _lastCo2;
  unsigned long _lastReadingTime;
  bool _hasBaseline;

  uint8_t _channelToComponent(uint8_t channel);
  void _trackResponseTime(uint8_t component, float readingBefore, float readingAfter, unsigned long timeDelta);
};

extern PredictiveMaintenance predictiveMaint;

#endif
