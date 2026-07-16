import express from 'express';
import { CultivationCycle, CycleState, PhaseTransition, Recipe, Device, BioactiveProfile } from '../models/index.js';
import { executePhaseTransition } from '../services/phaseEvaluator.js';
import { logAudit } from '../services/auditService.js';
import { getCorrelation, getEnvironmentSummary } from '../services/bioactiveAnalyzer.js';
import { getPhaseThresholds } from '../services/controlEngine.js';
import { publishActuatorCommand } from '../services/mqttBridge.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.tenant && req.tenant.userId) where.userId = req.tenant.userId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.chamberId) where.chamberId = req.query.chamberId;

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

router.get('/:id', async (req, res) => {
  try {
    const cycle = await CultivationCycle.findByPk(req.params.id, {
      include: [
        { model: Recipe },
        { model: PhaseTransition, order: [['createdAt', 'DESC']], limit: 10 },
      ],
    });
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const { recipeId, species, strain, startDate, deviceId, chamberId, notes, adaptationConfig } = req.body;
    if (!recipeId) return res.status(400).json({ error: 'recipeId es requerido' });

    let resolvedChamberId = chamberId;
    if (deviceId) {
      const dev = await Device.findByPk(deviceId);
      if (!dev) return res.status(400).json({ error: 'El dispositivo no existe' });
      if (dev.chamberId != null && resolvedChamberId == null) resolvedChamberId = dev.chamberId;
    }

    const recipe = await Recipe.findByPk(recipeId);
    if (!recipe) return res.status(400).json({ error: 'La receta no existe' });

    const cycle = await CultivationCycle.create({
      recipeId: parseInt(recipeId, 10),
      species: species || recipe.species,
      strain: strain || undefined,
      startDate: startDate || undefined,
      deviceId: deviceId || undefined,
      chamberId: resolvedChamberId || undefined,
      notes: notes || undefined,
      userId: req.user.id,
      adaptationConfig: adaptationConfig || { mode: 'SEMI_AUTO', sensorBasedTrigger: true },
      phaseStartedAt: startDate || new Date(),
    });

    await logAudit({ userId: req.user.id, action: 'CYCLE_CREATE', resource: 'cycle', resourceId: cycle.id });
    res.status(201).json(cycle);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const cycle = await CultivationCycle.findByPk(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });
    if (req.tenant && req.tenant.userId && cycle.userId && cycle.userId !== req.tenant.userId) {
      return res.status(403).json({ error: 'Sin acceso a este ciclo' });
    }

    const allowedFields = ['notes', 'adaptationConfig', 'status', 'currentPhase', 'endDate'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.currentPhase && updates.currentPhase !== cycle.currentPhase) {
      updates.phaseStartedAt = new Date();
    }

    await cycle.update(updates);

    if (updates.status === 'ACTIVE' && cycle.deviceId) {
      try {
        const recipe = await Recipe.findByPk(cycle.recipeId);
        if (recipe) {
          const thresholds = getPhaseThresholds(recipe, cycle.currentPhase || 'INCUBATION');
          if (thresholds) {
            const config = {
              phase: cycle.currentPhase || 'INCUBATION',
              setpoints: {
                tempMin: thresholds.tempMin,
                tempMax: thresholds.tempMax,
                humMin: thresholds.humMin,
                humMax: thresholds.humMax,
                co2Max: thresholds.co2Max,
              },
            };
            publishActuatorCommand(cycle.deviceId, [], config);
          }
        }
      } catch { /* best-effort: activation already saved */ }
    }

    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/transition', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const cycle = await CultivationCycle.findByPk(req.params.id, { include: [{ model: Recipe }] });
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });
    if (cycle.currentPhase === 'COMPLETED') {
      return res.status(400).json({ error: 'El ciclo ya está completado' });
    }

    const { toPhase, notes } = req.body;
    if (!toPhase) return res.status(400).json({ error: 'toPhase es requerido' });

    const validPhases = ['INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'];
    if (!validPhases.includes(toPhase)) {
      return res.status(400).json({ error: `Fase inválida. Válidas: ${validPhases.join(', ')}` });
    }

    const transitionResult = {
      shouldTransition: true,
      triggerType: 'MANUAL',
      fromPhase: cycle.currentPhase,
      toPhase,
      triggerData: {
        sensorReadings: {},
        ruleMatched: { manualOverride: true },
        notes: notes || 'Transición manual por operador',
      },
      status: 'EXECUTED',
    };

    const transition = await executePhaseTransition(cycle, transitionResult);

    await logAudit({
      userId: req.user.id,
      action: 'CYCLE_TRANSITION',
      resource: 'cycle',
      resourceId: cycle.id,
      details: { from: transition.fromPhase, to: transition.toPhase, trigger: 'MANUAL' },
    });

    res.json(transition);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id/transitions', async (req, res) => {
  try {
    const transitions = await PhaseTransition.findAll({
      where: { cycleId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit || '50', 10),
    });
    res.json({ data: transitions });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/abort', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const cycle = await CultivationCycle.findByPk(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });
    if (cycle.status === 'COMPLETED' || cycle.status === 'ABORTED') {
      return res.status(400).json({ error: `El ciclo ya está ${cycle.status.toLowerCase()}` });
    }

    await cycle.update({ status: 'ABORTED', endDate: new Date(), notes: cycle.notes + '\n[ABORT] Abortado por operador' });

    if (cycle.deviceId) {
      const device = await Device.findByPk(cycle.deviceId);
      if (device) {
        const { Actuator } = await import('../models/index.js');
        for (const ch of [1, 2, 3]) {
          try {
            const [act] = await Actuator.findOrCreate({ where: { deviceId: device.id, channel: ch }, defaults: { deviceId: device.id, channel: ch } });
            await act.update({ state: 'OFF', mode: 'REMOTE', lastSeen: new Date() });
          } catch (e) {
            console.error(`[CYCLE] Error turning off ch${ch}:`, e.message);
          }
        }
      }
    }

    await logAudit({ userId: req.user.id, action: 'CYCLE_ABORT', resource: 'cycle', resourceId: cycle.id });
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id/states', async (req, res) => {
  try {
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

router.get('/:id/bioactives', async (req, res) => {
  try {
    const { compoundName, from, to, limit = 100 } = req.query;
    const where = { cycleId: req.params.id };
    if (compoundName) where.compoundName = compoundName;
    if (from || to) {
      where.analysisDate = {};
      if (from) where.analysisDate[Op.gte] = new Date(from);
      if (to) where.analysisDate[Op.lte] = new Date(to);
    }
    const data = await BioactiveProfile.findAll({
      where,
      order: [['compoundName', 'ASC'], ['analysisDate', 'DESC']],
      limit: parseInt(limit, 10),
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/bioactives', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const cycle = await CultivationCycle.findByPk(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });

    const { compoundName, concentration, unit, analysisDate, labSource, notes } = req.body;
    if (!compoundName || concentration === undefined) {
      return res.status(400).json({ error: 'compoundName y concentration son requeridos' });
    }

    const profile = await BioactiveProfile.create({
      cycleId: parseInt(req.params.id, 10),
      compoundName,
      concentration: parseFloat(concentration),
      unit: unit || 'mg/g',
      analysisDate: analysisDate || new Date(),
      labSource: labSource || null,
      notes: notes || null,
      timestamp: new Date(),
    });

    await logAudit({
      userId: req.user.id,
      action: 'BIOACTIVE_ADD',
      resource: 'bioactive',
      resourceId: profile.id,
      details: { cycleId: req.params.id, compoundName, concentration },
    });

    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id/bioactives/correlation', async (req, res) => {
  try {
    const result = await getCorrelation(req.params.id);
    if (!result) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ciclo no encontrado' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id/environment-summary', async (req, res) => {
  try {
    const summary = await getEnvironmentSummary(req.params.id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
