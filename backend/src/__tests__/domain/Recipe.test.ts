import { describe, it, expect } from 'vitest';
import { Recipe, RecipeId, TemperatureRange, HumidityRange, CO2Target, Phase } from '../../domain/index.js';

describe('Recipe', () => {
  const recipeId = RecipeId.create('recipe-1');

  it('creates a valid recipe with phases', () => {
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

    const result = Recipe.create({
      id: recipeId,
      name: 'Reishi',
      species: 'Ganoderma lucidum',
      phases: [phase],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Reishi');
      expect(result.value.phases).toHaveLength(1);
    }
  });

  it('rejects recipe without phases', () => {
    const result = Recipe.create({
      id: recipeId,
      name: 'Reishi',
      species: 'Ganoderma lucidum',
      phases: [],
    });
    expect(result.isErr()).toBe(true);
  });

  it('rejects recipe without name', () => {
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

    const result = Recipe.create({
      id: recipeId,
      name: '',
      species: 'Ganoderma lucidum',
      phases: [phase],
    });
    expect(result.isErr()).toBe(true);
  });

  it('finds phase by name', () => {
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

    const recipe = Recipe.create({
      id: recipeId,
      name: 'Reishi',
      species: 'Ganoderma lucidum',
      phases: [phase],
    }).unwrap();

    expect(recipe.getPhaseByName('INCUBATION')).toBe(phase);
    expect(recipe.getPhaseByName('FRUITING')).toBeUndefined();
  });
});
