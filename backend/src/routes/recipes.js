import express from 'express';
import { Recipe, CultivationCycle, CycleState, Device } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

router.get('/recipes', async (req, res) => {
  try {
    const where = {};
    if (req.tenant && req.tenant.userId) {
      where.userId = req.tenant.userId;
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

    const recipe = await Recipe.create({ ...req.body, userId: req.user.id });

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

    await recipe.update(req.body);

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

router.get('/cycles', async (req, res) => {
  try {
    const where = {};
    if (req.tenant && req.tenant.userId) {
      where.userId = req.tenant.userId;
    }
    const cycles = await CultivationCycle.findAll({
      where,
      include: [{ model: Recipe }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: cycles });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/cycles', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const { recipeId, species, strain, startDate, deviceId, chamberId, notes } = req.body;

    if (!recipeId || !species) {
      return res.status(400).json({ error: 'recipeId y species son requeridos' });
    }

    let resolvedChamberId = chamberId;
    if (deviceId) {
      const dev = await Device.findByPk(deviceId);
      if (!dev) {
        return res.status(400).json({ error: 'El dispositivo no existe' });
      }
      if (dev.chamberId != null && resolvedChamberId == null) {
        resolvedChamberId = dev.chamberId;
      }
    }

    const cycle = await CultivationCycle.create({
      recipeId: parseInt(recipeId, 10),
      species,
      strain: strain || undefined,
      startDate: startDate || undefined,
      deviceId: deviceId || undefined,
      chamberId: resolvedChamberId || undefined,
      notes: notes || undefined,
      userId: req.user.id,
    });

    await logAudit({
      userId: req.user.id,
      action: 'CYCLE_CREATE',
      resource: 'cycle',
      resourceId: cycle.id,
    });

    res.status(201).json(cycle);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/cycles/:id', async (req, res) => {
  try {
    const cycle = await CultivationCycle.findByPk(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });

    if (req.tenant && req.tenant.userId && cycle.userId && cycle.userId !== req.tenant.userId) {
      return res.status(403).json({ error: 'Sin acceso a este ciclo' });
    }

    await cycle.update(req.body);
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/cycles/:id/states', async (req, res) => {
  try {
    const cycle = await CultivationCycle.findByPk(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });

    if (req.tenant && req.tenant.userId && cycle.userId && cycle.userId !== req.tenant.userId) {
      return res.status(403).json({ error: 'Sin acceso a este ciclo' });
    }

    const states = await CycleState.findAll({
      where: { cycleId: req.params.id },
      order: [['snapshotDate', 'DESC']],
      limit: parseInt(req.query.limit || '100', 10),
    });
    res.json({ data: states });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
