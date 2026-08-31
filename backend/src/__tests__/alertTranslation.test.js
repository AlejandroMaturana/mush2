import { explainAlarm, SENSOR_LABEL } from '../services/alertTranslationService.js';

function alarm(overrides = {}) {
  return {
    id: 1,
    deviceId: 1,
    type: 'THRESHOLD_CROSSED',
    severity: 'HIGH',
    message: 'Umbral de temperatura superado',
    sensorType: 'TEMPERATURE',
    currentValue: '35.00',
    thresholdMin: '18.00',
    thresholdMax: '30.00',
    isAcknowledged: false,
    resolvedAt: null,
    ...overrides,
  };
}

describe('D3/T11 — alertTranslationService (single source of truth)', () => {
  it('devuelve los 5 niveles en idioma cotidiano', () => {
    const r = explainAlarm(alarm({ type: 'OUT_OF_RANGE', sensorType: 'HUMIDITY', currentValue: '85.00' }));
    expect(r).toEqual(expect.objectContaining({
      what: expect.stringContaining('Humedad'),
      meaning: expect.any(String),
      impact: expect.any(String),
      action: expect.any(String),
      verify: expect.any(String),
    }));
    expect(Object.keys(r)).toEqual(['what', 'meaning', 'impact', 'action', 'verify']);
  });

  it('THRESHOLD_CROSSED → "Se superó el umbral de" + nombre del sensor', () => {
    const r = explainAlarm(alarm({ type: 'THRESHOLD_CROSSED', sensorType: 'TEMPERATURE', currentValue: '35.00' }));
    expect(r.what).toMatch(/Se superó el umbral de Temperatura/);
  });

  it('no inventa recomendaciones de hardware (límite M0.1 D3)', () => {
    const words = ['recalibr', 'cambie el sensor', 'reemplace', 'firmware', 'hardware', 'sustituya'];
    for (const type of ['OUT_OF_RANGE', 'THRESHOLD_CROSSED', 'DISCONNECTED', 'SENSOR_FAULT', 'SYSTEM_ERROR']) {
      const r = explainAlarm(alarm({ type }));
      for (const field of Object.values(r)) {
        for (const w of words) {
          expect(field.toLowerCase()).not.toContain(w);
        }
      }
    }
  });

  it('unknown type → fallback genérico sin romper', () => {
    const r = explainAlarm(alarm({ type: 'RARO' }));
    expect(r.what).toBeTruthy();
    expect(r.verify).toBeTruthy();
  });

  it('no agrega el valor si ya está presente en el texto', () => {
    const r = explainAlarm(alarm({ type: 'THRESHOLD_CROSSED', sensorType: 'CO2', currentValue: '1200.00' }));
    expect(r.what).toContain('CO₂');
    // El valor no debe duplicarse dos veces.
    const occurrences = r.what.match(/1200/g) || [];
    expect(occurrences.length).toBe(1);
  });

  it('SENSOR_LABEL mapea los 4 sensores', () => {
    expect(SENSOR_LABEL.TEMPERATURE).toBe('Temperatura');
    expect(SENSOR_LABEL.HUMIDITY).toBe('Humedad');
    expect(SENSOR_LABEL.CO2).toBe('CO₂');
    expect(SENSOR_LABEL.VOC).toBe('VOC');
  });
});
