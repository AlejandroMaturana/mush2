import { describe, it, expect } from 'vitest';
import { CanStartRun, CanAbortRun, CanCreateRecipe } from '../../domain/index.js';
import { Run, RunId, ChamberId, RecipeId, TemperatureRange, HumidityRange, CO2Target, Phase } from '../../domain/index.js';

describe('Policies', () => {
  describe('CanStartRun', () => {
    it('allows start when no active runs for chamber', () => {
      const policy = new CanStartRun();
      const result = policy.evaluate([], 'chamber-1');
      expect(result.isOk()).toBe(true);
    });

    it('rejects start when chamber has active run', () => {
      const policy = new CanStartRun();
      const activeRun = Run.create({
        id: RunId.create('run-1'),
        chamberId: ChamberId.create('chamber-1'),
        recipeId: RecipeId.create('recipe-1'),
        status: 'ACTIVE',
        controlState: 'NORMAL',
        currentPhase: 'INCUBATION',
        startedAt: new Date(),
      });
      const result = policy.evaluate([activeRun], 'chamber-1');
      expect(result.isErr()).toBe(true);
    });

    it('allows start when other chamber has active run', () => {
      const policy = new CanStartRun();
      const activeRun = Run.create({
        id: RunId.create('run-1'),
        chamberId: ChamberId.create('chamber-2'),
        recipeId: RecipeId.create('recipe-1'),
        status: 'ACTIVE',
        controlState: 'NORMAL',
        currentPhase: 'INCUBATION',
        startedAt: new Date(),
      });
      const result = policy.evaluate([activeRun], 'chamber-1');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('CanAbortRun', () => {
    it('allows abort for active run', () => {
      const policy = new CanAbortRun();
      const run = Run.create({
        id: RunId.create('run-1'),
        chamberId: ChamberId.create('chamber-1'),
        recipeId: RecipeId.create('recipe-1'),
        status: 'ACTIVE',
        controlState: 'NORMAL',
        currentPhase: 'INCUBATION',
        startedAt: new Date(),
      });
      const result = policy.evaluate(run);
      expect(result.isOk()).toBe(true);
    });

    it('rejects abort for completed run', () => {
      const policy = new CanAbortRun();
      const run = Run.create({
        id: RunId.create('run-1'),
        chamberId: ChamberId.create('chamber-1'),
        recipeId: RecipeId.create('recipe-1'),
        status: 'COMPLETED',
        controlState: 'NORMAL',
        currentPhase: 'INCUBATION',
        startedAt: new Date(),
      });
      const result = policy.evaluate(run);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('CanCreateRecipe', () => {
    it('allows recipe with phases', () => {
      const policy = new CanCreateRecipe();
      const tempRange = TemperatureRange.create(18, 25).unwrap();
      const humRange = HumidityRange.create(80, 95).unwrap();
      const co2Target = CO2Target.create(400, 800).unwrap();
      const phase = Phase.create({
        name: 'INCUBATION',
        tempRange,
        humRange,
        co2Target,
        durationDays: 14,
      }).unwrap();
      const result = policy.evaluate([phase]);
      expect(result.isOk()).toBe(true);
    });

    it('rejects recipe without phases', () => {
      const policy = new CanCreateRecipe();
      const result = policy.evaluate([]);
      expect(result.isErr()).toBe(true);
    });
  });
});
