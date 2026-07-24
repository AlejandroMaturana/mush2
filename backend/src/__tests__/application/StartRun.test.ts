import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FixedClock, SequentialUUID, Ok } from '../../shared/index.js';
import { StartRun } from '../../application/use-cases/StartRun.js';
import { Run, Chamber, Recipe, RunId, ChamberId, RecipeId, TemperatureRange, HumidityRange, CO2Target, Phase } from '../../domain/index.js';
import type { RunRepository, ChamberRepository, RecipeRepository } from '../../domain/index.js';

function makeChamber(id = 'chamber-1') {
  return Chamber.create({ id: ChamberId.create(id), name: 'Test Chamber', deviceId: 'esp32_001' });
}

function makeRecipe(id = 'recipe-1') {
  const tempRange = TemperatureRange.create(18, 25).unwrap();
  const humRange = HumidityRange.create(80, 95).unwrap();
  const co2Target = CO2Target.create(400, 800).unwrap();
  const phase = Phase.create({ name: 'INCUBATION', tempRange, humRange, co2Target, durationDays: 14 }).unwrap();
  return Recipe.create({ id: RecipeId.create(id), name: 'Reishi', species: 'Ganoderma lucidum', phases: [phase] }).unwrap();
}

describe('StartRun', () => {
  let clock: FixedClock;
  let uuid: SequentialUUID;
  let mockEventBus: { publish: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clock = new FixedClock(new Date('2026-01-01'));
    uuid = new SequentialUUID();
    mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
  });

  it('creates a run when chamber has no active runs', async () => {
    const chamber = makeChamber();
    const recipe = makeRecipe();

    const mockRunRepo: RunRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByChamberId: vi.fn().mockResolvedValue(null),
      findActiveRuns: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockChamberRepo: ChamberRepository = {
      findById: vi.fn().mockResolvedValue(chamber),
      findByDeviceId: vi.fn().mockResolvedValue(chamber),
      findAll: vi.fn().mockResolvedValue([chamber]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockRecipeRepo: RecipeRepository = {
      findById: vi.fn().mockResolvedValue(recipe),
      findAll: vi.fn().mockResolvedValue([recipe]),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const startRun = new StartRun(mockRunRepo, mockChamberRepo, mockRecipeRepo, mockEventBus, uuid, clock);
    const result = await startRun.execute({ chamberId: 'esp32_001', recipeId: 'recipe-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe('ACTIVE');
      expect(result.value.controlState).toBe('NORMAL');
      expect(result.value.currentPhase).toBe('INCUBATION');
    }
    expect(mockRunRepo.save).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });

  it('rejects start when chamber has active run', async () => {
    const chamber = makeChamber();
    const recipe = makeRecipe();
    const existingRun = Run.create({
      id: RunId.create('existing-run'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date(),
    });

    const mockRunRepo: RunRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByChamberId: vi.fn().mockResolvedValue(existingRun),
      findActiveRuns: vi.fn().mockResolvedValue([existingRun]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockChamberRepo: ChamberRepository = {
      findById: vi.fn().mockResolvedValue(chamber),
      findByDeviceId: vi.fn().mockResolvedValue(chamber),
      findAll: vi.fn().mockResolvedValue([chamber]),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockRecipeRepo: RecipeRepository = {
      findById: vi.fn().mockResolvedValue(recipe),
      findAll: vi.fn().mockResolvedValue([recipe]),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const startRun = new StartRun(mockRunRepo, mockChamberRepo, mockRecipeRepo, mockEventBus, uuid, clock);
    const result = await startRun.execute({ chamberId: 'esp32_001', recipeId: 'recipe-1' });

    expect(result.isErr()).toBe(true);
    expect(mockRunRepo.save).not.toHaveBeenCalled();
  });
});
