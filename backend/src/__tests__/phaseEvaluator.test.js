import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';

const mockPhaseTransitionCreate = jest.fn();
const mockCycleUpdate = jest.fn();
const mockEmit = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  PhaseTransition: { create: mockPhaseTransitionCreate },
  CultivationCycle: {},
  Recipe: {},
}));

jest.unstable_mockModule('../services/eventBus.js', () => ({
  events: { emit: mockEmit },
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

const {
  evaluatePhaseTransition,
  executePhaseTransition,
  recordSensorReading,
  sensorHistory,
} = await import('../services/phaseEvaluator.js');

function makeCycle(overrides = {}) {
  return {
    id: 'cycle-1',
    currentPhase: 'INCUBATION',
    adaptationConfig: { mode: 'AUTO' },
    phaseStartedAt: new Date(),
    update: mockCycleUpdate,
    ...overrides,
  };
}

describe('sensorHistory bounding (ISSUE-026)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-08-15T12:00:00Z') });
    mockPhaseTransitionCreate.mockReset();
    mockCycleUpdate.mockReset();
    mockEmit.mockReset();
    mockCycleUpdate.mockResolvedValue(undefined);
    for (const key of Object.keys(sensorHistory)) delete sensorHistory[key];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caps sensorHistory per field at MAX_HISTORY_PER_FIELD (2000)', () => {
    for (let i = 0; i < 2001; i++) {
      recordSensorReading('cycle-1', 'co2', 800);
    }
    expect(sensorHistory['cycle-1'].co2).toHaveLength(2000);
  });

  it('discards readings older than the 1h window', () => {
    recordSensorReading('cycle-1', 'co2', 900);
    jest.advanceTimersByTime(3_600_001);
    recordSensorReading('cycle-1', 'co2', 700);

    const history = sensorHistory['cycle-1'].co2;
    expect(history).toHaveLength(1);
    expect(history[0].value).toBe(700);
  });

  it('keeps histories per field independent', () => {
    recordSensorReading('cycle-1', 'co2', 800);
    recordSensorReading('cycle-1', 'temperature', 22);
    expect(sensorHistory['cycle-1'].co2).toHaveLength(1);
    expect(sensorHistory['cycle-1'].temperature).toHaveLength(1);
  });

  it('cleans up history when a cycle reaches COMPLETED', async () => {
    mockPhaseTransitionCreate.mockResolvedValue({
      id: 1,
      status: 'EXECUTED',
      fromPhase: 'MAINTENANCE',
      toPhase: 'COMPLETED',
      triggerType: 'TIME',
    });
    recordSensorReading('cycle-1', 'co2', 800);
    expect(sensorHistory['cycle-1']).toBeDefined();

    const cycle = makeCycle({ currentPhase: 'MAINTENANCE' });
    await executePhaseTransition(cycle, {
      fromPhase: 'MAINTENANCE',
      toPhase: 'COMPLETED',
      triggerType: 'TIME',
      triggerData: {},
      status: 'EXECUTED',
    });

    expect(sensorHistory['cycle-1']).toBeUndefined();
    expect(mockCycleUpdate).toHaveBeenCalledWith(expect.objectContaining({ currentPhase: 'COMPLETED' }));
  });

  it('keeps history when a transition to a non-final phase executes', async () => {
    mockPhaseTransitionCreate.mockResolvedValue({
      id: 2,
      status: 'EXECUTED',
      fromPhase: 'INCUBATION',
      toPhase: 'FRUITING',
      triggerType: 'TIME',
    });
    recordSensorReading('cycle-1', 'co2', 800);

    const cycle = makeCycle();
    await executePhaseTransition(cycle, {
      fromPhase: 'INCUBATION',
      toPhase: 'FRUITING',
      triggerType: 'TIME',
      triggerData: {},
      status: 'EXECUTED',
    });

    expect(sensorHistory['cycle-1']).toBeDefined();
    expect(sensorHistory['cycle-1'].co2).toHaveLength(1);
  });

  it('evaluatePhaseTransition records readings for AUTO cycles', async () => {
    const recipe = { scientificName: 'Pleurotus ostreatus' };
    const cycle = makeCycle({ id: 'cycle-2', phaseStartedAt: new Date() });
    await evaluatePhaseTransition(cycle, { temperature: 25 }, recipe);
    expect(sensorHistory['cycle-2'].temperature).toHaveLength(1);
  });
});
