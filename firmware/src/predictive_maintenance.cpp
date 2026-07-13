#include "predictive_maintenance.h"
#include "config.h"

PredictiveMaintenance predictiveMaint;

void PredictiveMaintenance::init() {
  memset(_metrics, 0, sizeof(_metrics));
  _lastTemp = 0;
  _lastHum = 0;
  _lastCo2 = 0;
  _lastReadingTime = 0;
  _hasBaseline = false;

  for (int i = 0; i < MAINT_COMPONENTS; i++) {
    _metrics[i].avgResponseTime = 0;
    _metrics[i].responseTimeIndex = 0;
    _metrics[i].responseTimeCount = 0;
    _metrics[i].degraded = false;
    _metrics[i].reason[0] = '\0';
  }

  Serial.println("[MAINT] PredictiveMaintenance inicializado");
}

uint8_t PredictiveMaintenance::_channelToComponent(uint8_t channel) {
  switch (channel) {
    case 1: return MAINT_VENT;
    case 2: return MAINT_HEATER;
    case 3: return MAINT_HUMIDIFIER;
    case 4: return MAINT_LIGHT;
    default: return 0xFF;
  }
}

void PredictiveMaintenance::onActuatorChange(uint8_t channel, bool isOn, unsigned long timestamp) {
  uint8_t comp = _channelToComponent(channel);
  if (comp == 0xFF) return;

  ActuatorMetrics& m = _metrics[comp];

  if (isOn) {
    m.lastOnTimestamp = timestamp;
    m.totalOnTime = 0;
    m.cycleCount++;
    m.active = true;
  } else {
    m.lastOffTimestamp = timestamp;
    if (m.lastOnTimestamp > 0) {
      m.totalOnTime += (timestamp - m.lastOnTimestamp);
    }
    m.active = false;
  }
}

void PredictiveMaintenance::onSensorReading(float temp, float hum, uint16_t co2, unsigned long timestamp) {
  if (!_hasBaseline) {
    _lastTemp = temp;
    _lastHum = hum;
    _lastCo2 = co2;
    _lastReadingTime = timestamp;
    _hasBaseline = true;
    return;
  }

  unsigned long timeDelta = timestamp - _lastReadingTime;
  if (timeDelta < 1000) return;

  for (int ch = 1; ch <= 3; ch++) {
    uint8_t comp = _channelToComponent(ch);
    ActuatorMetrics& m = _metrics[comp];

    if (m.active && m.lastOnTimestamp > 0) {
      float readingBefore, readingAfter;

      if (comp == MAINT_HEATER) {
        readingBefore = _lastTemp;
        readingAfter = temp;
        float expectedRise = (timeDelta / 1000.0) * 0.5;
        float actualRise = readingAfter - readingBefore;
        if (actualRise < expectedRise * 0.5) {
          _trackResponseTime(comp, readingBefore, readingAfter, timeDelta);
        }
      } else if (comp == MAINT_HUMIDIFIER) {
        readingBefore = _lastHum;
        readingAfter = hum;
        float expectedRise = (timeDelta / 1000.0) * 2.0;
        float actualRise = readingAfter - readingBefore;
        if (actualRise < expectedRise * 0.5) {
          _trackResponseTime(comp, readingBefore, readingAfter, timeDelta);
        }
      } else if (comp == MAINT_VENT) {
        readingBefore = _lastCo2;
        readingAfter = co2;
        float expectedDrop = (timeDelta / 1000.0) * 50.0;
        float actualDrop = readingBefore - readingAfter;
        if (actualDrop < expectedDrop * 0.5 && readingBefore > 800) {
          _trackResponseTime(comp, readingBefore, readingAfter, timeDelta);
        }
      }
    }
  }

  _lastTemp = temp;
  _lastHum = hum;
  _lastCo2 = co2;
  _lastReadingTime = timestamp;
}

void PredictiveMaintenance::_trackResponseTime(uint8_t component, float readingBefore, float readingAfter, unsigned long timeDelta) {
  ActuatorMetrics& m = _metrics[component];
  float responseTime = (float)timeDelta / 1000.0;

  m.responseTimeHistory[m.responseTimeIndex] = responseTime;
  m.responseTimeIndex = (m.responseTimeIndex + 1) % MAINT_HISTORY_SIZE;
  if (m.responseTimeCount < MAINT_HISTORY_SIZE) m.responseTimeCount++;

  float sum = 0;
  for (int i = 0; i < m.responseTimeCount; i++) {
    sum += m.responseTimeHistory[i];
  }
  m.avgResponseTime = sum / m.responseTimeCount;

  const char* compNames[] = {"VENT", "HEATER", "HUMIDIFIER", "LIGHT"};
  Serial.printf("[MAINT] %s response time: %.1fs (avg: %.1fs)\n",
    compNames[component], responseTime, m.avgResponseTime);
}

void PredictiveMaintenance::evaluate() {
  for (int i = 0; i < MAINT_COMPONENTS; i++) {
    ActuatorMetrics& m = _metrics[i];
    m.degraded = false;
    m.reason[0] = '\0';

    if (m.responseTimeCount < 3) continue;

    const char* compNames[] = {"VENT", "HEATER", "HUMIDIFIER", "LIGHT"};
    float baselineResponse = 0;

    switch (i) {
      case MAINT_VENT: baselineResponse = 30.0; break;
      case MAINT_HEATER: baselineResponse = 20.0; break;
      case MAINT_HUMIDIFIER: baselineResponse = 15.0; break;
      case MAINT_LIGHT: baselineResponse = 0.5; break;
    }

    if (baselineResponse > 0 && m.avgResponseTime > baselineResponse * 3.0) {
      m.degraded = true;
      snprintf(m.reason, sizeof(m.reason), "%s degradado: avg response %.1fs (baseline %.1fs)",
        compNames[i], m.avgResponseTime, baselineResponse);
      Serial.printf("[MAINT] ALERT: %s\n", m.reason);
    }
  }
}

uint8_t PredictiveMaintenance::getReport(MaintenanceReport* reports, uint8_t maxReports) {
  uint8_t count = 0;
  const char* compNames[] = {"VENT", "HEATER", "HUMIDIFIER", "LIGHT"};

  for (int i = 0; i < MAINT_COMPONENTS && count < maxReports; i++) {
    ActuatorMetrics& m = _metrics[i];
    MaintenanceReport& r = reports[count];

    strncpy(r.component, compNames[i], sizeof(r.component));

    if (m.degraded) {
      r.health = 30;
      r.estimatedFailure = (uint32_t)(m.avgResponseTime * 100);
      strncpy(r.reason, m.reason, sizeof(r.reason));
    } else if (m.responseTimeCount > 0) {
      r.health = 90;
      r.estimatedFailure = 0;
      snprintf(r.reason, sizeof(r.reason), "Normal: avg %.1fs", m.avgResponseTime);
    } else {
      r.health = 100;
      r.estimatedFailure = 0;
      snprintf(r.reason, sizeof(r.reason), "Sin datos suficientes");
    }

    count++;
  }

  return count;
}

bool PredictiveMaintenance::isDegraded(uint8_t channel) {
  uint8_t comp = _channelToComponent(channel);
  if (comp == 0xFF) return false;
  return _metrics[comp].degraded;
}

const char* PredictiveMaintenance::getDegradationReason(uint8_t channel) {
  uint8_t comp = _channelToComponent(channel);
  if (comp == 0xFF) return "";
  return _metrics[comp].reason;
}
