import { describe, it, expect } from 'vitest';
import { Run, RunId, ChamberId, RecipeId, Chamber, TemperatureRange, HumidityRange, CO2Target, Phase } from '../../domain/index.js';
import { toRunDomain, toRunRecord, type RunRecord } from '../../persistence/mappers/RunMapper.js';
import { toChamberDomain, toChamberRecord, type ChamberRecord } from '../../persistence/mappers/ChamberMapper.js';
import { toTelemetryDomain, toTelemetryRecord, type TelemetryRecord } from '../../persistence/mappers/TelemetryMapper.js';

describe('RunMapper', () => {
  it('should convert Run domain to record and back', () => {
    const tempRange = TemperatureRange.create(22, 25);
    const humRange = HumidityRange.create(80, 90);
    const co2Target = CO2Target.create(800);
    const phase = Phase.create('INCUBATION', tempRange, humRange, co2Target, 14);

    const run = Run.create({
      id: RunId.create('1'),
      chamberId: ChamberId.create('1'),
      recipeId: RecipeId.create('1'),
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date('2026-01-15T10:00:00Z'),
    });

    const record = toRunRecord(run);
    expect(record.chamberId).toBe(1);
    expect(record.recipeId).toBe(1);
    expect(record.status).toBe('ACTIVE');

    const restored = toRunDomain(record);
    expect(restored.chamberId.value).toBe('1');
    expect(restored.recipeId.value).toBe('1');
    expect(restored.status).toBe('ACTIVE');
  });
});

describe('ChamberMapper', () => {
  it('should convert Chamber domain to record and back', () => {
    const chamber = Chamber.create({
      id: ChamberId.create('1'),
      name: 'Grow Room A',
      deviceId: '42',
      location: 'Basement',
    });

    const record = toChamberRecord(chamber);
    expect(record.id).toBe(1);
    expect(record.name).toBe('Grow Room A');

    const restored = toChamberDomain(record);
    expect(restored.id.value).toBe('1');
    expect(restored.name).toBe('Grow Room A');
  });
});

describe('TelemetryMapper', () => {
  it('should convert Telemetry domain to record and back', () => {
    const telemetry = {
      toData: () => ({
        id: '123',
        runId: RunId.create('1'),
        deviceId: '42',
        timestamp: new Date('2026-01-15T10:00:00Z'),
        temperature: 23.5,
        humidity: 85.0,
        co2: 750,
        aqi: 45,
        voc: 120,
        ssrState: [1, 0, 1],
        wifiRssi: -65,
      }),
    };

    const record = toTelemetryRecord(telemetry as any);
    expect(record.runId).toBe(1);
    expect(record.temperature).toBe(23.5);
    expect(record.humidity).toBe(85.0);
    expect(record.co2).toBe(750);
  });
});
