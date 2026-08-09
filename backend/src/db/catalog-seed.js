/**
 * Catalog seeding — populates species profiles, medicinal properties,
 * bioactive compounds and cultivation recipes (I68).
 *
 * This module is imported by:
 *  - seed-catalog.js  (standalone CLI, guarded by catalogSeedAllowed)
 *  - seed.js          (development fixtures, guarded by isSeedAllowed)
 *
 * It must NOT contain test fixtures, fake credentials or admin users.
 */
import sequelize from '../config/database.js';
import {
  SpeciesProfile,
  MedicinalProperty,
  BioactiveCompound,
  Recipe,
} from '../models/index.js';
import { DIFFICULTY_MAP, SPECIES, RECIPES } from './catalog-data.js';

export async function seedCatalog() {
  console.log(`[Seed] ${SPECIES.length} especies`);

  for (const data of SPECIES) {
    const difficultyLevel = DIFFICULTY_MAP[data.dificultad] || 'BEGINNER';
    const imageUrl = `/images/species/${data.id}.webp`;

    const existing = await SpeciesProfile.findOne({ where: { scientificName: data.nombre_cientifico } });
    let species;
    if (existing) {
      await existing.update({
        name: data.nombre_comun,
        adapterClass: data.clase,
        originClimate: data.clima_origen,
        difficultyLevel,
        description: data.descripcion,
        shortDescription: data.descripcion,
        imageUrl,
        generalAttributes: data.atributos_generales || {},
      });
      species = existing;
      console.log(`[Seed] Actualizada: ${species.name}`);
    } else {
      species = await SpeciesProfile.create({
        name: data.nombre_comun,
        scientificName: data.nombre_cientifico,
        adapterClass: data.clase,
        originClimate: data.clima_origen,
        difficultyLevel,
        description: data.descripcion,
        shortDescription: data.descripcion,
        imageUrl,
        generalAttributes: data.atributos_generales || {},
      });
      console.log(`[Seed] Creada: ${species.name}`);
    }

    if (data.propiedades_medicinales?.length) {
      for (const prop of data.propiedades_medicinales) {
        const existingProp = await MedicinalProperty.findOne({
          where: { speciesId: species.id, category: prop.categoria },
        });
        if (existingProp) {
          await existingProp.update({ description: prop.descripcion });
        } else {
          await MedicinalProperty.create({
            speciesId: species.id,
            category: prop.categoria,
            description: prop.descripcion,
          });
        }
      }
    }

    if (data.compuestos_bioactivos?.length) {
      for (const comp of data.compuestos_bioactivos) {
        const existingComp = await BioactiveCompound.findOne({
          where: { speciesId: species.id, name: comp.nombre },
        });
        if (existingComp) {
          await existingComp.update({ value: comp.valor });
        } else {
          await BioactiveCompound.create({
            speciesId: species.id,
            name: comp.nombre,
            value: comp.valor,
          });
        }
      }
    }
  }

  console.log('[Seed] Especies pobladas');

  for (const data of RECIPES) {
    const [recipe, created] = await Recipe.findOrCreate({
      where: { name: data.name },
      defaults: data,
    });
    console.log(`[Seed] ${created ? 'Creada' : 'Ya existe'}: receta ${recipe.name}`);
  }

  const allSpecies = await SpeciesProfile.findAll();
  const speciesMap = Object.fromEntries(allSpecies.map(s => [s.scientificName, s.id]));

  const allRecipes = await Recipe.findAll({ where: { speciesId: null } });
  for (const recipe of allRecipes) {
    const speciesId = speciesMap[recipe.species];
    if (speciesId) {
      await recipe.update({ speciesId });
      console.log(`[Seed] Vinculada receta "${recipe.name}" → especie id=${speciesId}`);
    }
  }

  return { species: SPECIES.length, recipes: RECIPES.length };
}

export async function runCatalogSeedAndClose() {
  try {
    await sequelize.authenticate();
    console.log('[Seed] DB conectada');
    const summary = await seedCatalog();
    await sequelize.close();
    console.log(`[Seed] OK — ${summary.species} especies, ${summary.recipes} recetas`);
  } catch (err) {
    console.error('[Seed] Error:', err);
    process.exit(1);
  }
}

export default seedCatalog;
