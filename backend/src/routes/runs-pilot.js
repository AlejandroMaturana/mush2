import express from 'express';
import { getContainer } from '../composition-root.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const { recipeId, chamberId } = req.body;
    if (!recipeId) return res.status(400).json({ error: 'recipeId es requerido' });
    if (!chamberId) return res.status(400).json({ error: 'chamberId es requerido' });

    const container = getContainer();
    const result = await container.startRun.execute({ chamberId, recipeId });

    if (result.isErr()) {
      const error = result.error;
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
      }
      if (error.message.includes('already has an active run')) {
        return res.status(409).json({ error: 'CONFLICT', message: error.message });
      }
      return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
    }

    const run = result.value;
    res.status(201).json({
      id: run.id.value,
      chamberId: run.chamberId.value,
      recipeId: run.recipeId.value,
      status: run.status,
      controlState: run.controlState,
      currentPhase: run.currentPhase,
      startedAt: run.startedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/abort', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const container = getContainer();
    const result = await container.abortRun.execute({
      runId: req.params.id,
      reason: req.body.reason || 'Abortado por operador',
    });

    if (result.isErr()) {
      const error = result.error;
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
      }
      if (error.message.includes('not abortable')) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: error.message });
      }
      return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
    }

    const run = result.value;
    res.json({
      id: run.id.value,
      chamberId: run.chamberId.value,
      recipeId: run.recipeId.value,
      status: run.status,
      controlState: run.controlState,
      currentPhase: run.currentPhase,
      startedAt: run.startedAt,
      abortedAt: run.abortedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
