import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FixedClock, SequentialUUID, Ok } from '../../shared/index.js';
import { StartRun } from '../../application/use-cases/StartRun.js';
import { ReceiveTelemetry } from '../../application/use-cases/ReceiveTelemetry.js';
import { ComputeActuators } from '../../application/use-cases/ComputeActuators.js';
import { EvaluatePhase } from '../../application/use-cases/EvaluatePhase.js';
import { RaiseAlarms } from '../../application/use-cases/RaiseAlarms.js';
import { AbortRun } from '../../application/use-cases/AbortRun.js';
import {
  Run, RunId, Chamber, ChamberId, Recipe, RecipeId,
  Telemetry, Alarm,
  TemperatureRange, HumidityRange, CO2Target, Phase,
} from '../../domain/index.js';
import type {
  RunRepository, ChamberRepository, RecipeRepository,
  TelemetryRepository, AlarmRepository,
} from '../../domain/index.js';

function makeChamber(id = 'chamber-1') {
  return Chamber.create({ id: ChamberId.create(id), name: 'Test Chamber', deviceId: 'esp32_001' });
}

function makeRecipe(phases?: { name: string; temp: [number, number]; hum: [number, number]; co2: [number, number]; days: number }[]) {
  const defaults = phases || [
    { name: 'INCUBATION', temp: [18, 28], hum: [80, 95], co2: [400, 800], days: 14 },
    { name: 'FRUITING', temp: [20, 26], hum: [85, 95], co2: [400, 600], days: 10 },
  ];
  const domainPhases = defaults.map(p => {
    const tr = TemperatureRange.create(p.temp[0], p.temp[1]).unwrap();
    const hr = HumidityRange.create(p.hum[0], p.hum[1]).unwrap();
    const ct = CO2Target.create(p.co2[0], p.co2[1]).unwrap();
    return Phase.create({ name: p.name, tempRange: tr, humRange: hr, co2Target: ct, durationDays: p.days }).unwrap();
  });
  return Recipe.create({ id: RecipeId.create('recipe-1'), name: 'Reishi', species: 'Ganoderma lucidum', phases: domainPhases }).unwrap();
}

function makeTelemetry(runId: string, overrides: Partial<{ temperature: number; humidity: number; co2: number; voc: number; aqi: number; ssrState: number[]; wifiRssi: number }> = {}) {
  return Telemetry.create({
    runId: RunId.create(runId),
    deviceId: 'esp32_001',
    timestamp: new Date(),
    temperature: 24,
    humidity: 88,
    co2: 500,
    voc: 10,
    aqi: 1,
    ssrState: [0, 0, 0, 0],
    wifiRssi: -65,
    ...overrides,
  });
}

describe('WORKFLOW: Run Lifecycle', () => {
  let clock: FixedClock;
  let uuid: SequentialUUID;
  let mockEventBus: { publish: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> };
  let mockRunRepo: RunRepository;
  let mockChamberRepo: ChamberRepository;
  let mockRecipeRepo: RecipeRepository;
  let mockTelemetryRepo: TelemetryRepository;
  let mockAlarmRepo: AlarmRepository;

  beforeEach(() => {
    clock = new FixedClock(new Date('2026-06-01'));
    uuid = new SequentialUUID();
    mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
    mockRunRepo = {
      findById: vi.fn().mockResolvedValue(null),
      findByChamberId: vi.fn().mockResolvedValue(null),
      findActiveRuns: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockChamberRepo = {
      findById: vi.fn().mockResolvedValue(null),
      findByDeviceId: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockRecipeRepo = {
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockTelemetryRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findLatestByRunId: vi.fn().mockResolvedValue(null),
      findByRunIdAndTimeRange: vi.fn().mockResolvedValue([]),
    };
    mockAlarmRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findActiveByRunId: vi.fn().mockResolvedValue([]),
      findByRunId: vi.fn().mockResolvedValue([]),
      resolve: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('W001 — Happy path: start → telemetry → actuators → phase transition', async () => {
    const chamber = makeChamber();
    const recipe = makeRecipe();
    mockChamberRepo.findByDeviceId = vi.fn().mockResolvedValue(chamber);
    mockRecipeRepo.findById = vi.fn().mockResolvedValue(recipe);

    const startRun = new StartRun(mockRunRepo, mockChamberRepo, mockRecipeRepo, mockEventBus, uuid, clock);
    const startResult = await startRun.execute({ chamberId: 'esp32_001', recipeId: 'recipe-1' });
    expect(startResult.isOk()).toBe(true);
    expect(startResult.unwrap().status).toBe('ACTIVE');
    const run = startResult.unwrap();

    mockRunRepo.findById = vi.fn().mockResolvedValue(run);
    mockTelemetryRepo.findLatestByRunId = vi.fn().mockResolvedValue(null);

    const receiveTelemetry = new ReceiveTelemetry(mockTelemetryRepo, mockRunRepo, mockEventBus, uuid, clock);
    const telemetryResult = await receiveTelemetry.execute({
      runId: run.id.value,
      deviceId: 'esp32_001',
      temperature: 24.5,
      humidity: 88,
      co2: 500,
      voc: 10,
      aqi: 1,
      ssrState: [0, 0, 0, 0],
      wifiRssi: -65,
    });
    expect(telemetryResult.isOk()).toBe(true);
    const telemetry = telemetryResult.unwrap();

    const computeActuators = new ComputeActuators(mockRecipeRepo);
    const actuatorResult = await computeActuators.execute({ run, telemetry });
    expect(actuatorResult.isOk()).toBe(true);
    expect(actuatorResult.unwrap()).toHaveLength(0);
    expect(mockEventBus.publish).toHaveBeenCalled();

    const evaluatePhase = new EvaluatePhase(mockRecipeRepo);
    const evalResult = await evaluatePhase.execute({ run, latestTelemetry: telemetry });
    expect(evalResult.isOk()).toBe(true);
    expect(evalResult.unwrap().shouldTransition).toBe(true);
    expect(evalResult.unwrap().newPhase).toBe('FRUITING');
  });

  it('W002 — Actuators respond when conditions deviate', async () => {
    const recipe = makeRecipe();
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE', controlState: 'NORMAL', currentPhase: 'INCUBATION', startedAt: clock.now(),
    });
    mockRecipeRepo.findById = vi.fn().mockResolvedValue(recipe);

    const coldTelemetry = makeTelemetry('run-1', { temperature: 15, humidity: 88, co2: 500 });
    const computeActuators = new ComputeActuators(mockRecipeRepo);
    const coldResult = await computeActuators.execute({ run, telemetry: coldTelemetry });
    expect(coldResult.isOk()).toBe(true);
    const cmds = coldResult.unwrap();
    const heaterCmd = cmds.find(c => c.channel === 1);
    expect(heaterCmd?.state).toBe('ON');

    const hotTelemetry = makeTelemetry('run-1', { temperature: 32, humidity: 88, co2: 500 });
    const hotResult = await computeActuators.execute({ run, telemetry: hotTelemetry });
    expect(hotResult.isOk()).toBe(true);
    const hotCmds = hotResult.unwrap();
    const heaterOffCmd = hotCmds.find(c => c.channel === 1);
    expect(heaterOffCmd?.state).toBe('OFF');

    const highCo2Telemetry = makeTelemetry('run-1', { temperature: 24, humidity: 88, co2: 1200 });
    const co2Result = await computeActuators.execute({ run, telemetry: highCo2Telemetry });
    expect(co2Result.isOk()).toBe(true);
    const co2Cmds = co2Result.unwrap();
    expect(co2Cmds.find(c => c.channel === 0)?.state).toBe('ON');
  });

  it('W003 — EvaluatePhase triggers transition when conditions met', async () => {
    const recipe = makeRecipe([
      { name: 'INCUBATION', temp: [18, 28], hum: [80, 95], co2: [400, 800], days: 14 },
      { name: 'FRUITING', temp: [20, 26], hum: [85, 95], co2: [400, 600], days: 10 },
    ]);
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE', controlState: 'NORMAL', currentPhase: 'INCUBATION', startedAt: clock.now(),
    });
    mockRecipeRepo.findById = vi.fn().mockResolvedValue(recipe);

    const telemetryInRange = makeTelemetry('run-1', { temperature: 23, humidity: 90, co2: 500 });
    const evaluatePhase = new EvaluatePhase(mockRecipeRepo);
    const evalResult = await evaluatePhase.execute({ run, latestTelemetry: telemetryInRange });
    expect(evalResult.isOk()).toBe(true);
    expect(evalResult.unwrap().shouldTransition).toBe(true);
    expect(evalResult.unwrap().newPhase).toBe('FRUITING');

    const telemetryOutOfRange = makeTelemetry('run-1', { temperature: 15, humidity: 90, co2: 500 });
    const evalResult2 = await evaluatePhase.execute({ run, latestTelemetry: telemetryOutOfRange });
    expect(evalResult2.isOk()).toBe(true);
    expect(evalResult2.unwrap().shouldTransition).toBe(false);
  });

  it('W004 — Alarms raised on critical conditions and resolved on recovery', async () => {
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE', controlState: 'NORMAL', currentPhase: 'INCUBATION', startedAt: clock.now(),
    });

    const hotTelemetry = makeTelemetry('run-1', { temperature: 40, humidity: 88, co2: 500 });
    mockAlarmRepo.findActiveByRunId = vi.fn().mockResolvedValue([]);
    const raiseAlarms = new RaiseAlarms(mockAlarmRepo, mockEventBus, clock);
    const raiseResult = await raiseAlarms.execute({ run, telemetry: hotTelemetry });
    expect(raiseResult.isOk()).toBe(true);
    expect(raiseResult.unwrap().raised).toHaveLength(1);
    expect(raiseResult.unwrap().raised[0].type).toBe('TEMP_CRITICAL');
    expect(mockAlarmRepo.save).toHaveBeenCalledOnce();

    const existingAlarm = Alarm.create({
      runId: RunId.create('run-1'),
      type: 'TEMP_CRITICAL', severity: 'CRITICAL', message: 'Hot', status: 'ACTIVE', raisedAt: clock.now(),
    });
    mockAlarmRepo.findActiveByRunId = vi.fn().mockResolvedValue([existingAlarm]);
    const recoverResult = await raiseAlarms.execute({ run, telemetry: makeTelemetry('run-1', { temperature: 25 }) });
    expect(recoverResult.isOk()).toBe(true);
    expect(recoverResult.unwrap().resolved).toHaveLength(1);
    expect(mockAlarmRepo.resolve).toHaveBeenCalledOnce();
  });

  it('W005 — Abort run terminates the workflow', async () => {
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE', controlState: 'NORMAL', currentPhase: 'INCUBATION', startedAt: clock.now(),
    });
    mockRunRepo.findById = vi.fn().mockResolvedValue(run);

    const abortRun = new AbortRun(mockRunRepo, mockEventBus, clock);
    const abortResult = await abortRun.execute({ runId: 'run-1', reason: 'Sensor failure' });
    expect(abortResult.isOk()).toBe(true);
    expect(abortResult.unwrap().status).toBe('ABORTED');
    expect(mockRunRepo.save).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();

    const cannotAbortResult = await abortRun.execute({ runId: 'run-1' });
    expect(cannotAbortResult.isErr()).toBe(true);
  });

  it('W006 — Full lifecycle: start → telemetry → alarms → abort', async () => {
    const chamber = makeChamber();
    const recipe = makeRecipe();
    mockChamberRepo.findByDeviceId = vi.fn().mockResolvedValue(chamber);
    mockRecipeRepo.findById = vi.fn().mockResolvedValue(recipe);
    mockAlarmRepo.findActiveByRunId = vi.fn().mockResolvedValue([]);

    const startRun = new StartRun(mockRunRepo, mockChamberRepo, mockRecipeRepo, mockEventBus, uuid, clock);
    const startResult = await startRun.execute({ chamberId: 'esp32_001', recipeId: 'recipe-1' });
    expect(startResult.isOk()).toBe(true);
    const run = startResult.unwrap();

    mockRunRepo.findById = vi.fn().mockResolvedValue(run);
    const criticalTelemetry = makeTelemetry(run.id.value, { temperature: 42, humidity: 88, co2: 500 });
    const receiveTelemetry = new ReceiveTelemetry(mockTelemetryRepo, mockRunRepo, mockEventBus, uuid, clock);
    const telemetryResult = await receiveTelemetry.execute({
      runId: run.id.value,
      deviceId: 'esp32_001',
      temperature: 42,
      humidity: 88,
      co2: 500,
      voc: 10,
      aqi: 1,
      ssrState: [0, 0, 0, 0],
      wifiRssi: -65,
    });
    expect(telemetryResult.isOk()).toBe(true);
    const telemetry = telemetryResult.unwrap();

    const raiseAlarms = new RaiseAlarms(mockAlarmRepo, mockEventBus, clock);
    const alarmResult = await raiseAlarms.execute({ run, telemetry });
    expect(alarmResult.isOk()).toBe(true);
    expect(alarmResult.unwrap().raised.length).toBeGreaterThan(0);

    const abortRun = new AbortRun(mockRunRepo, mockEventBus, clock);
    const abortResult = await abortRun.execute({ runId: run.id.value, reason: 'Critical temperature' });
    expect(abortResult.isOk()).toBe(true);
    expect(abortResult.unwrap().status).toBe('ABORTED');
  });
});
