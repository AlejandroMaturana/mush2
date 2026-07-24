import type { RecipeRepository } from '../../domain/index.js';
import { Recipe, TemperatureRange, HumidityRange, CO2Target, Phase } from '../../domain/index.js';
import RecipeModel from '../../models/Recipe.js';
import { toRecipeDomain, toRecipeRecord, type RecipeRecord } from '../mappers/RecipeMapper.js';

export class SequelizeRecipeRepository implements RecipeRepository {
  async findById(id: string): Promise<Recipe | null> {
    const record = await RecipeModel.findByPk(Number(id));
    if (!record) return null;
    const data = record as any;
    const phases = (data.phases || []).map((p: any) => {
      const tempRange = TemperatureRange.create(p.temperature.min, p.temperature.max);
      const humRange = HumidityRange.create(p.humidity.min, p.humidity.max);
      const co2Target = CO2Target.create(p.co2.target);
      return Phase.create(p.name, tempRange, humRange, co2Target, p.durationDays);
    });

    return Recipe.fromData({
      id: String(data.id),
      name: data.name,
      species: data.species,
      strain: data.strain,
      phases,
    });
  }

  async findAll(): Promise<Recipe[]> {
    const records = await RecipeModel.findAll();
    const recipes: Recipe[] = [];
    for (const record of records) {
      const recipe = await this.findById(String((record as any).id));
      if (recipe) recipes.push(recipe);
    }
    return recipes;
  }

  async save(recipe: Recipe): Promise<void> {
    const record = toRecipeRecord(recipe);
    await RecipeModel.upsert(record);
  }
}
