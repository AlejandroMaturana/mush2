import express from 'express';
import { SpeciesProfile, Recipe } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

router.get('/species', async (req, res) => {
  try {
    const where = {};
    if (req.query.adapterClass) where.adapterClass = req.query.adapterClass;
    if (req.query.originClimate) where.originClimate = { [Op.iLike]: `%${req.query.originClimate}%` };
    if (req.query.difficultyLevel) where.difficultyLevel = req.query.difficultyLevel;

    const species = await SpeciesProfile.findAll({ where, order: [['name', 'ASC']] });
    res.json({ data: species });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/species/:id', async (req, res) => {
  try {
    const species = await SpeciesProfile.findByPk(req.params.id, {
      include: [{ model: Recipe }],
    });
    if (!species) return res.status(404).json({ error: 'NOT_FOUND', message: 'Especie no encontrada' });
    res.json(species);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/species', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const species = await SpeciesProfile.create(req.body);
    res.status(201).json(species);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/species/:id', async (req, res) => {
  try {
    const species = await SpeciesProfile.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'NOT_FOUND', message: 'Especie no encontrada' });

    await species.update(req.body);
    res.json(species);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/species/:id', async (req, res) => {
  try {
    const species = await SpeciesProfile.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'NOT_FOUND', message: 'Especie no encontrada' });

    await species.destroy();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
