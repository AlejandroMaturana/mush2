import { describe, it, expect } from 'vitest';
import { ControlEngine, createDefaultGuards } from '../../control-engine/index.js';
import { Run, RunId, ChamberId, RecipeId, Telemetry } from '../../domain/index.js';

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

function makeTelemetry(overrides: Partial<{ temperature: number; humidity: number; timestamp: Date }> = {}) {
  return Telemetry.create({
    runId: RunId.create('run-1'),
    deviceId: 'esp32_001',
    timestamp: overrides.timestamp || new Date(),
    temperature: overrides.temperature ?? 24,
    humidity: overrides.humidity ?? 85,
    co2: 500,
    voc: 10,
    aqi: 1,
    ssrState: [0, 0, 0, 0],
    wifiRssi: -65,
  });
}

describe('ControlEngine', () => {
  it('returns no triggered guards for normal conditions', () => {
    const engine = new ControlEngine(createDefaultGuards());
    const results = engine.evaluate({
      run: makeRun(),
      telemetry: makeTelemetry(),
      activeAlarms: [],
    });
    expect(results).toHaveLength(0);
  });

  it('returns first triggered guard', () => {
    const engine = new ControlEngine(createDefaultGuards());
    const result = engine.evaluateFirst({
      run: makeRun(),
      telemetry: makeTelemetry({ temperature: 35 }),
      activeAlarms: [],
    });
    expect(result).not.toBeNull();
    expect(result!.guardName).toBe('OverheatGuard');
  });

  it('returns multiple triggered guards', () => {
    const engine = new ControlEngine(createDefaultGuards());
    const staleTime = new Date(Date.now() - 15 * 60 * 1000);
    const results = engine.evaluate({
      run: makeRun(),
      telemetry: makeTelemetry({ temperature: 35, timestamp: staleTime }),
      activeAlarms: [],
    });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null when no guards trigger', () => {
    const engine = new ControlEngine(createDefaultGuards());
    const result = engine.evaluateFirst({
      run: makeRun(),
      telemetry: makeTelemetry(),
      activeAlarms: [],
    });
    expect(result).toBeNull();
  });
});
