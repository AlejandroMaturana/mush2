import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';

// ISSUE-107 (TST-003) - cobertura de la ruta runtime real.
// services/controlEngine.js es el "Control Engine" real (orquestador ADR-021)
// y no tenia ningun test de ejecucion (solo source-scan). Este suite lo
// ejecuta end-to-end con la capa de persistencia mockeada.

const mockCycleFindAll = jest.fn();
const mockActuatorFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockTelemetryFindOne = jest.fn();
const mockAlarmFindOne = jest.fn();
const mockSystemSettingFindOne = jest.fn();
const mockCycleStateCreate = jest.fn();
const mockAlarmCreate = jest.fn();
const mockQuery = jest.fn();
const mockActuatorFindOrCreate = jest.fn();
const mockEmit = jest.fn();
const mockRecordOutgoing = jest.fn();
const mockEvaluatePhaseTransition = jest.fn();
const mockExecutePhaseTransition = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Device: { findByPk: mockFindByPk },
  Telemetry: { findOne: mockTelemetryFindOne, sequelize: { query: mockQuery } },
  Recipe: { findByPk: mockFindByPk },
  CultivationCycle: { findAll: mockCycleFindAll },
  CycleState: { create: mockCycleStateCreate },
  Actuator: { findAll: mockActuatorFindAll, findOrCreate: mockActuatorFindOrCreate },
  Alarm: { findOne: mockAlarmFindOne, create: mockAlarmCreate },
}));

jest.unstable_mockModule('../../models/SystemSetting.js', () => ({
  default: { findOne: mockSystemSettingFindOne },
}));

jest.unstable_mockModule('../../services/eventBus.js', () => ({
  events: { emit: mockEmit },
}));

jest.unstable_mockModule('../../services/phaseEvaluator.js', () => ({
  evaluatePhaseTransition: mockEvaluatePhaseTransition,
  executePhaseTransition: mockExecutePhaseTransition,
}));

jest.unstable_mockModule('../../services/deviceHealthService.js', () => ({
  recordOutgoing: mockRecordOutgoing,
}));

jest.unstable_mockModule('../../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), fatal: jest.fn() }),
}));

const {
  evaluateAllCycles,
  startControlEngine,
  stopControlEngine,
  getPhaseThresholds,
} = await import('../../services/controlEngine.js');

function makeRecipe(overrides = {}) {
  return {
    incubationTempMin: 20, incubationTempMax: 26,
    incubationHumMin: 70, incubationHumMax: 90,
    incubationCo2Max: 1200, incubationDurationDays: 10,
    fruitingTempMin: 15, fruitingTempMax: 22,
    fruitingHumMin: 80, fruitingHumMax: 95,
    fruitingCo2Max: 1000, fruitingDurationDays: 8,
    maintenanceTempMin: 18, maintenanceTempMax: 25,
    maintenanceHumMin: 70, maintenanceHumMax: 90,
    maintenanceCo2Max: 900, maintenanceDurationDays: null,
    ...overrides,
  };
}

function makeCycle(deviceId, overrides = {}) {
  return {
    id: 'cycle-1',
    recipeId: 'recipe-1',
    currentPhase: 'INCUBATION',
    deviceId,
    chamberId: null,
    status: 'ACTIVE',
    startDate: new Date(),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeReadings(rows) {
  return [
    rows || [
      { sensorType: 'TEMPERATURE', value: 24, timestamp: new Date() },
      { sensorType: 'HUMIDITY', value: 80, timestamp: new Date() },
      { sensorType: 'CO2', value: 700, timestamp: new Date() },
      { sensorType: 'VOC', value: 100, timestamp: new Date() },
    ],
  ];
}

function mockActuator() {
  return {
    id: 1,
    update: jest.fn().mockResolvedValue(undefined),
    state: 'OFF',
    lastCommand: null,
    mode: 'REMOTE',
    lastSeen: null,
  };
}

function stubRuntimeDeps(deviceId, opts = {}) {
  mockCycleFindAll.mockResolvedValue(opts.cycles ?? [makeCycle(deviceId)]);
  mockFindByPk.mockImplementation(async (id) => {
    if (id === 'recipe-1') return makeRecipe();
    if (id === deviceId) return { id: 1, deviceId };
    return null;
  });
  mockQuery.mockResolvedValue(makeReadings(opts.rows));
  mockTelemetryFindOne.mockResolvedValue({ sensorType: 'TEMPERATURE', value: 24, timestamp: new Date() });
  mockAlarmFindOne.mockResolvedValue(null);
  mockSystemSettingFindOne.mockResolvedValue(null);
  mockCycleStateCreate.mockResolvedValue({ id: 1 });
  mockAlarmCreate.mockResolvedValue({ id: 99, createdAt: new Date() });
  mockActuatorFindAll.mockResolvedValue([]);
  mockActuatorFindOrCreate.mockResolvedValue([mockActuator()]);
  mockEvaluatePhaseTransition.mockResolvedValue({ shouldTransition: false });
  mockExecutePhaseTransition.mockResolvedValue(undefined);
  mockRecordOutgoing.mockResolvedValue(undefined);
}

beforeEach(() => {
  for (const m of [
    mockCycleFindAll, mockActuatorFindAll, mockFindByPk,
    mockTelemetryFindOne, mockAlarmFindOne, mockSystemSettingFindOne,
    mockCycleStateCreate, mockAlarmCreate, mockQuery, mockActuatorFindOrCreate,
    mockEmit, mockRecordOutgoing, mockEvaluatePhaseTransition, mockExecutePhaseTransition,
  ]) {
    m.mockReset();
  }
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getPhaseThresholds (umbrales del orquestador)', () => {
  it('devuelve umbrales de INCUBATION', () => {
    const t = getPhaseThresholds(makeRecipe(), 'INCUBATION');
    expect(t.tempMin).toBe(20);
    expect(t.tempMax).toBe(26);
    expect(t.durationDays).toBe(10);
  });

  it('devuelve umbrales de FRUITING y MAINTENANCE', () => {
    expect(getPhaseThresholds(makeRecipe(), 'FRUITING').tempMax).toBe(22);
    expect(getPhaseThresholds(makeRecipe(), 'MAINTENANCE').durationDays).toBeNull();
  });

  it('devuelve null para fase desconocida', () => {
    expect(getPhaseThresholds(makeRecipe(), 'UNKNOWN')).toBeNull();
  });
});

describe('evaluateAllCycles — ruta runtime real', () => {
  it('ciclo sin desviaciones: CycleState + control_eval, sin comandos ni alarmas', async () => {
    stubRuntimeDeps('dev-normal-1');
    await evaluateAllCycles();

    expect(mockCycleStateCreate).toHaveBeenCalled();
    const evalEvents = mockEmit.mock.calls.filter(([ev]) => ev === 'control_eval');
    expect(evalEvents.length).toBe(1);
    expect(evalEvents[0][1].deviceId).toBe('dev-normal-1');
    expect(evalEvents[0][1].readings.temp).toBe(24);
    expect(evalEvents[0][1].readings.humidity).toBeUndefined();
    expect(evalEvents[0][1].actuatorCommands).toEqual([]);
    expect(mockEmit.mock.calls.some(([ev]) => ev === 'alarm')).toBe(false);
    expect(mockActuatorFindOrCreate).not.toHaveBeenCalled();
    expect(mockRecordOutgoing).not.toHaveBeenCalled();
  });

  it('temp crítica (>= 32°C): fail-safe OVERHEAT vent ON + heat/humid OFF + alarma', async () => {
    stubRuntimeDeps('dev-critical-1', {
      rows: [
        { sensorType: 'TEMPERATURE', value: 35, timestamp: new Date() },
        { sensorType: 'HUMIDITY', value: 80, timestamp: new Date() },
        { sensorType: 'CO2', value: 700, timestamp: new Date() },
        { sensorType: 'VOC', value: 100, timestamp: new Date() },
      ],
    });
    await evaluateAllCycles();

    const evalEvents = mockEmit.mock.calls.filter(([ev]) => ev === 'control_eval');
    expect(evalEvents).toHaveLength(1);
    const cmds = evalEvents[0][1].actuatorCommands;
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toMatchObject({ channel: 1, command: 'ON', reason: 'OVERHEAT' });
    expect(cmds[1]).toMatchObject({ channel: 2, command: 'OFF', reason: 'OVERHEAT' });
    expect(cmds[2]).toMatchObject({ channel: 3, command: 'OFF', reason: 'OVERHEAT' });
    expect(mockActuatorFindOrCreate).toHaveBeenCalledTimes(3);
    expect(mockRecordOutgoing).toHaveBeenCalledWith('dev-critical-1');

    const alarmEvents = mockEmit.mock.calls.filter(([ev]) => ev === 'alarm');
    expect(alarmEvents).toHaveLength(1);
    expect(alarmEvents[0][1]).toMatchObject({ type: 'THRESHOLD_CROSSED', sensorType: 'TEMPERATURE', severity: 'CRITICAL' });
  });

  it('histéresis OVERHEAT: persiste tras el pico y se limpia al bajar de TEMP_RECOVERY', async () => {
    const hot = [
      { sensorType: 'TEMPERATURE', value: 35, timestamp: new Date() },
      { sensorType: 'HUMIDITY', value: 80, timestamp: new Date() },
      { sensorType: 'CO2', value: 700, timestamp: new Date() },
      { sensorType: 'VOC', value: 100, timestamp: new Date() },
    ];
    const ok = [
      { sensorType: 'TEMPERATURE', value: 25, timestamp: new Date() },
      { sensorType: 'HUMIDITY', value: 80, timestamp: new Date() },
      { sensorType: 'CO2', value: 700, timestamp: new Date() },
      { sensorType: 'VOC', value: 100, timestamp: new Date() },
    ];
    stubRuntimeDeps('dev-hyst-1', { rows: hot });
    await evaluateAllCycles();
    const cmdsHot = mockEmit.mock.calls.filter(([ev]) => ev === 'control_eval')[0][1].actuatorCommands;
    expect(cmdsHot.map((c) => `${c.channel}=${c.command}`)).toEqual(['1=ON', '2=OFF', '3=OFF']);

    stubRuntimeDeps('dev-hyst-1', { rows: ok });
    await evaluateAllCycles();
    const cmdsOk = mockEmit.mock.calls.filter(([ev]) => ev === 'control_eval')[1][1].actuatorCommands;
    expect(cmdsOk).toEqual([]);
  });

  it('transición de fase por duración (INCUBATION → FRUITING) con phase_transition', async () => {
    const cycle = makeCycle('dev-phase-1', { startDate: new Date('2026-07-01T00:00:00Z') });
    stubRuntimeDeps('dev-phase-1', { cycles: [cycle] });
    await evaluateAllCycles();

    expect(mockCycleFindAll).toHaveBeenCalled();
    expect(cycle.update).toHaveBeenCalledWith(expect.objectContaining({ currentPhase: 'FRUITING' }));

    // Comportamiento real del engine (controlEngine.js): tras la transición de
    // fase por duración emite el control_eval del eval + un segundo control_eval
    // que transporte `event: 'PHASE_TRANSITION'` (fromPhase → toPhase).
    const evalEvents = mockEmit.mock.calls.filter(([ev]) => ev === 'control_eval');
    expect(evalEvents).toHaveLength(2);

    const evalEval = evalEvents.find(([, p]) => !p.event);
    expect(evalEval[1].deviceId).toBe('dev-phase-1');
    expect(evalEval[1].phase).toBe('INCUBATION');

    const transitionEval = evalEvents.find(([, p]) => p.event === 'PHASE_TRANSITION');
    expect(transitionEval[1]).toMatchObject({
      deviceId: 'dev-phase-1',
      event: 'PHASE_TRANSITION',
      fromPhase: 'INCUBATION',
      toPhase: 'FRUITING',
    });

    const transitions = mockEmit.mock.calls.filter(([ev, p]) => ev === 'phase_transition' && p.toPhase === 'FRUITING');
    expect(transitions.length).toBe(2);
  });

  it('sin lecturas recientes: no crea CycleState ni emite control_eval', async () => {
    stubRuntimeDeps('dev-noread-1');
    mockTelemetryFindOne.mockResolvedValue(null);
    await evaluateAllCycles();

    expect(mockCycleStateCreate).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('sin ciclos activos: no evalúa ni emite', async () => {
    stubRuntimeDeps('dev-empty-1', { cycles: [] });
    await evaluateAllCycles();
    expect(mockCycleStateCreate).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('startControlEngine / stopControlEngine — ciclo de 60s', () => {
  it('inicia, evalúa y repite por interval; stop limpia el timer', async () => {
    stubRuntimeDeps('dev-timer-1', { cycles: [] });
    jest.useFakeTimers();

    startControlEngine();
    await jest.advanceTimersByTimeAsync(0);
    expect(mockCycleFindAll).toHaveBeenCalled();
    const calls = mockCycleFindAll.mock.calls.length;

    await jest.advanceTimersByTimeAsync(60001);
    expect(mockCycleFindAll.mock.calls.length).toBeGreaterThan(calls);

    stopControlEngine();
    const after = mockCycleFindAll.mock.calls.length;
    await jest.advanceTimersByTimeAsync(180001);
    expect(mockCycleFindAll.mock.calls.length).toBe(after);
  });
});
