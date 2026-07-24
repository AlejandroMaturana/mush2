import { describe, it, expect } from 'vitest';
import { OverheatGuard } from '../../control-engine/guards/OverheatGuard.js';
import { SensorFailureGuard } from '../../control-engine/guards/SensorFailureGuard.js';
import { HumidityGuard } from '../../control-engine/guards/HumidityGuard.js';
import { CommunicationGuard } from '../../control-engine/guards/CommunicationGuard.js';
import { Run, RunId, ChamberId, RecipeId, Telemetry, Alarm } from '../../domain/index.js';

function makeRun() {
  return Run.create({
    id: RunId.create('run-1'),
    chamberId: ChamberId.create('chamber-1'),
    recipeId: RecipeId.create('recipe-1'),
    status: 'ACTIVE',
    controlState: 'NORMAL',
    currentPhase: 'INCUBATION',
    startedAt: new Date(),
  });
}

function makeTelemetry(overrides: Partial<{ temperature: number; humidity: number; co2: number; timestamp: Date }> = {}) {
  return Telemetry.create({
    runId: RunId.create('run-1'),
    deviceId: 'esp32_001',
    timestamp: overrides.timestamp || new Date(),
    temperature: overrides.temperature ?? 24,
    humidity: overrides.humidity ?? 85,
    co2: overrides.co2 ?? 500,
    voc: 10,
    aqi: 1,
    ssrState: [0, 0, 0, 0],
    wifiRssi: -65,
  });
}

describe('Guards', () => {
  describe('OverheatGuard', () => {
    it('triggers when temperature > 32°C', () => {
      const guard = new OverheatGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ temperature: 35 }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(true);
      expect(result.controlState).toBe('EMERGENCY_STOP');
      expect(result.alarm?.severity).toBe('CRITICAL');
    });

    it('does not trigger when temperature is normal', () => {
      const guard = new OverheatGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ temperature: 24 }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe('SensorFailureGuard', () => {
    it('triggers when data is stale', () => {
      const guard = new SensorFailureGuard();
      const staleTime = new Date(Date.now() - 10 * 60 * 1000);
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ timestamp: staleTime }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(true);
      expect(result.controlState).toBe('WAITING_SENSOR');
    });

    it('does not trigger when data is fresh', () => {
      const guard = new SensorFailureGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ timestamp: new Date() }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe('HumidityGuard', () => {
    it('triggers when humidity below 60%', () => {
      const guard = new HumidityGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ humidity: 50 }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(true);
      expect(result.controlState).toBe('SAFE_MODE');
      expect(result.alarm?.type).toBe('HUMIDITY_LOW');
    });

    it('triggers when humidity above 95%', () => {
      const guard = new HumidityGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ humidity: 98 }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(true);
      expect(result.controlState).toBe('SAFE_MODE');
      expect(result.alarm?.type).toBe('HUMIDITY_HIGH');
    });

    it('does not trigger when humidity is in range', () => {
      const guard = new HumidityGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ humidity: 85 }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe('CommunicationGuard', () => {
    it('triggers when device offline > 10min', () => {
      const guard = new CommunicationGuard();
      const offlineTime = new Date(Date.now() - 15 * 60 * 1000);
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ timestamp: offlineTime }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(true);
      expect(result.controlState).toBe('OFFLINE_DEVICE');
    });

    it('does not trigger when device is online', () => {
      const guard = new CommunicationGuard();
      const result = guard.evaluate({
        run: makeRun(),
        telemetry: makeTelemetry({ timestamp: new Date() }),
        activeAlarms: [],
      });
      expect(result.triggered).toBe(false);
    });
  });
});
