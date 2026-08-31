import { describe, it, expect } from 'vitest';
import { explainAlarm, TRANSLATION } from '../alertTranslation.js';

const baseAlarm = (overrides = {}) => ({
  type: 'THRESHOLD_CROSSED',
  severity: 'HIGH',
  message: 'Temperatura fuera de rango',
  sensorType: 'TEMPERATURE',
  currentValue: 35,
  thresholdMin: 18,
  thresholdMax: 28,
  Device: { chamberName: 'Cámara Norte' },
  ...overrides,
});

describe('D3/T10 — alertTranslation.explainAlarm (patrón 5 niveles)', () => {
  it('devuelve los 5 niveles: qué ocurrió / significa / impacto / debería hacer / verificar', () => {
    const r = explainAlarm(baseAlarm());
    for (const k of ['what', 'meaning', 'impact', 'action', 'verify']) {
      expect(typeof r[k]).toBe('string');
      expect(r[k].length).toBeGreaterThan(0);
    }
  });

  it('traduce cada tipo de alarma sin jerga (no muestra el enum crudo)', () => {
    const types = ['SENSOR_FAULT', 'OUT_OF_RANGE', 'DISCONNECTED', 'SYSTEM_ERROR', 'THRESHOLD_CROSSED'];
    for (const type of types) {
      const r = explainAlarm(baseAlarm({ type, message: 'm' }));
      for (const k of ['what', 'meaning', 'impact', 'action', 'verify']) {
        expect(r[k].toUpperCase()).not.toContain(type);
      }
    }
  });

  it('no inventa recomendaciones de hardware (límite M0.1 D3)', () => {
    const r = explainAlarm(baseAlarm({ severity: 'CRITICAL' }));
    const forbidden = ['reemplace', 'cambie el sensor', 'compre', 'instale el módulo', 'reemplace la placa', 'firmware'];
    for (const k of ['what', 'meaning', 'impact', 'action', 'verify']) {
      const lower = r[k].toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toContain(word);
      }
    }
  });

  it('usa el sensor y los umbrales reales cuando están disponibles', () => {
    const r = explainAlarm(baseAlarm({ sensorType: 'TEMPERATURE', currentValue: 35, thresholdMin: 18, thresholdMax: 28 }));
    expect(r.what.toLowerCase()).toContain('temperatura');
    expect(r.what).toContain('35');
  });

  it('falla con datos ausentes y no expone valores crudos', () => {
    const r = explainAlarm(baseAlarm({ type: 'DISCONNECTED', message: ' ', currentValue: null, thresholdMin: null, thresholdMax: null, sensorType: null }));
    for (const k of ['what', 'meaning', 'impact', 'action', 'verify']) {
      expect(r[k].length).toBeGreaterThan(0);
    }
    expect(r.what.toUpperCase()).not.toContain('DISCONNECTED');
  });

  it('cubre el mapeo translation para los tipos definidos', () => {
    for (const key of Object.keys(TRANSLATION)) {
      expect(key).toMatch(/^(SENSOR_FAULT|OUT_OF_RANGE|DISCONNECTED|SYSTEM_ERROR|THRESHOLD_CROSSED)$/);
    }
  });
});
