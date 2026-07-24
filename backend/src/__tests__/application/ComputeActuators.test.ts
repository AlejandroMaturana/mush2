import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComputeActuators } from '../../application/use-cases/ComputeActuators.js';
import { Run, RunId, Telemetry, Recipe, RecipeId, ChamberId, TemperatureRange, HumidityRange, CO2Target, Phase, RunId as RID } from '../../domain/index.js';
import type { RecipeRepository } from '../../domain/index.js';

describe('ComputeActuators', () => {
  function makeRecipe() {
    const tempRange = TemperatureRange.create(18, 28).unwrap();
    const humRange = HumidityRange.create(80, 95).unwrap();
    const co2Target = CO2Target.create(400, 800).unwrap();
    const phase = Phase.create({ name: 'INCUBATION', tempRange, humRange, co2Target, durationDays: 14 }).unwrap();
    return Recipe.create({ id: RecipeId.create('recipe-1'), name: 'Reishi', species: 'Ganoderma', phases: [phase] }).unwrap();
  }

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

  it('returns heater ON when temp below min', async () => {
    const recipe = makeRecipe();
    const run = makeRun();
    const telemetry = Telemetry.create({
      runId: RID.create('run-1'),
      deviceId: 'esp32_001',
      timestamp: new Date(),
      temperature: 15,
      humidity: 88,
      co2: 500,
      voc: 10,
      aqi: 1,
      ssrState: [0, 0, 0, 0],
      wifiRssi: -65,
    });

    const mockRecipeRepo: RecipeRepository = {
      findById: vi.fn().mockResolvedValue(recipe),
      findAll: vi.fn().mockResolvedValue([recipe]),
      save: vi.fn(),
    };

    const compute = new ComputeActuators(mockRecipeRepo);
    const result = await compute.execute({ run, telemetry });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const heaterCmd = result.value.find(c => c.channel === 1);
      expect(heaterCmd).toBeDefined();
      expect(heaterCmd!.state).toBe('ON');
    }
  });

  it('returns fan ON when CO2 above max', async () => {
    const recipe = makeRecipe();
    const run = makeRun();
    const telemetry = Telemetry.create({
      runId: RID.create('run-1'),
      deviceId: 'esp32_001',
      timestamp: new Date(),
      temperature: 23,
      humidity: 88,
      co2: 900,
      voc: 10,
      aqi: 1,
      ssrState: [0, 0, 0, 0],
      wifiRssi: -65,
    });

    const mockRecipeRepo: RecipeRepository = {
      findById: vi.fn().mockResolvedValue(recipe),
      findAll: vi.fn().mockResolvedValue([recipe]),
      save: vi.fn(),
    };

    const compute = new ComputeActuators(mockRecipeRepo);
    const result = await compute.execute({ run, telemetry });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const fanCmd = result.value.find(c => c.channel === 0);
      expect(fanCmd).toBeDefined();
      expect(fanCmd!.state).toBe('ON');
    }
  });

  it('returns no commands when all in range', async () => {
    const recipe = makeRecipe();
    const run = makeRun();
    const telemetry = Telemetry.create({
      runId: RID.create('run-1'),
      deviceId: 'esp32_001',
      timestamp: new Date(),
      temperature: 23,
      humidity: 88,
      co2: 500,
      voc: 10,
      aqi: 1,
      ssrState: [0, 0, 0, 0],
      wifiRssi: -65,
    });

    const mockRecipeRepo: RecipeRepository = {
      findById: vi.fn().mockResolvedValue(recipe),
      findAll: vi.fn().mockResolvedValue([recipe]),
      save: vi.fn(),
    };

    const compute = new ComputeActuators(mockRecipeRepo);
    const result = await compute.execute({ run, telemetry });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });
});
