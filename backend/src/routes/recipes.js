import express from 'express';
import { Op } from 'sequelize';
import { Recipe } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

const RECIPE_FIELDS = ['name', 'speciesId', 'species', 'incubationTempMin', 'incubationTempMax', 'incubationHumMin', 'incubationHumMax', 'incubationCo2Max', 'incubationDurationDays', 'fruitingTempMin', 'fruitingTempMax', 'fruitingHumMin', 'fruitingHumMax', 'fruitingCo2Max', 'fruitingDurationDays', 'maintenanceTempMin', 'maintenanceTempMax', 'maintenanceHumMin', 'maintenanceHumMax', 'maintenanceCo2Max', 'faeIntervalMinutes', 'ventilationStrategy', 'lightCycleHours', 'faeLevel', 'dewPointMaxRH'];

function pickRecipeFields(body) {
  const updates = {};
  for (const field of RECIPE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  return updates;
}

router.get('/recipes', async (req, res) => {
  try {
    const where = {};
    if (req.tenant && req.tenant.userId) {
      where[Op.or] = [
        { userId: req.tenant.userId },
        { userId: null },
      ];
    }
    const recipes = await Recipe.findAll({ where, order: [['name', 'ASC']] });
    res.json({ data: recipes });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'NOT_FOUND', message: 'Receta no encontrada' });

    if (req.tenant && req.tenant.userId && recipe.userId && recipe.userId !== req.tenant.userId) {
      return res.status(403).json({ error: 'Sin acceso a esta receta' });
    }

    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/recipes', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const recipe = await Recipe.create({ ...pickRecipeFields(req.body), userId: req.user.id });

    await logAudit({
      userId: req.user.id,
      action: 'RECIPE_CREATE',
      resource: 'recipe',
      resourceId: recipe.id,
    });

    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'NOT_FOUND', message: 'Receta no encontrada' });

    if (req.tenant && req.tenant.userId && recipe.userId && recipe.userId !== req.tenant.userId) {
      return res.status(403).json({ error: 'Sin acceso a esta receta' });
    }

    const updates = pickRecipeFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No se proporcionaron campos válidos' });
    }

    await recipe.update(updates);

    await logAudit({
      userId: req.user?.id,
      action: 'RECIPE_UPDATE',
      resource: 'recipe',
      resourceId: recipe.id,
    });

    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
