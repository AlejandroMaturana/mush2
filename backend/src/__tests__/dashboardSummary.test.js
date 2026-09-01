import { aggregateLatestTelemetry } from '../routes/api.js';

describe('D1/T9 — aggregateLatestTelemetry (endpoint /dashboard/summary)', () => {
  it('agrupa la última telemetría por dispositivo en una sola pasada', () => {
    const rows = [
      { deviceId: 1, sensorType: 'TEMPERATURE', value: '23.5', unit: '°C', timestamp: 't1' },
      { deviceId: 1, sensorType: 'HUMIDITY', value: '71', unit: '%', timestamp: 't1' },
      { deviceId: 2, sensorType: 'CO2', value: '900', unit: 'ppm', timestamp: 't2' },
    ];
    const map = aggregateLatestTelemetry(rows);
    expect(map.get(1)).toMatchObject({ temperature: 23.5, temperature_unit: '°C', humidity: 71, humidity_unit: '%', ts: 't1' });
    expect(map.get(2)).toMatchObject({ co2: 900, co2_unit: 'ppm', ts: 't2' });
  });

  it('devuelve un Map vacío sin filas', () => {
    const map = aggregateLatestTelemetry([]);
    expect(map.size).toBe(0);
  });
});
