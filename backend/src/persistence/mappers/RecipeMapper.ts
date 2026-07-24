import { Recipe, RecipeId, TemperatureRange, HumidityRange, CO2Target, Phase } from '../../domain/index.js';
import type { RecipeData } from '../../domain/index.js';

export interface RecipeRecord {
  id: number;
  name: string;
  species: string;
  strain: string | null;
  phases: PhaseRecord[];
}

export interface PhaseRecord {
  name: string;
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
  co2: { target: number };
  durationDays: number;
}

export function toRecipeDomain(record: RecipeRecord): Recipe {
  const phases = record.phases.map(p => {
    const tempRange = TemperatureRange.create(p.temperature.min, p.temperature.max);
    const humRange = HumidityRange.create(p.humidity.min, p.humidity.max);
    const co2Target = CO2Target.create(p.co2.target);
    return Phase.create(p.name, tempRange, humRange, co2Target, p.durationDays);
  });

  const data: RecipeData = {
    id: String(record.id),
    name: record.name,
    species: record.species,
    strain: record.strain,
    phases,
  };
  return Recipe.fromData(data);
}

export function toRecipeRecord(recipe: Recipe): RecipeRecord {
  const data = recipe.toData();
  return {
    id: Number(data.id),
    name: data.name,
    species: data.species,
    strain: data.strain,
    phases: data.phases.map(p => ({
      name: p.name,
      temperature: { min: p.temperature.min, max: p.temperature.max },
      humidity: { min: p.humidity.min, max: p.humidity.max },
      co2: { target: p.co2.target },
      durationDays: p.durationDays,
    })),
  };
}
