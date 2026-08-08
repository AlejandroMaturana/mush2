import express from 'express';
import { SpeciesProfile, MedicinalProperty, BioactiveCompound } from '../models/index.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { Op } from 'sequelize';

const router = express.Router();

const CATALOG_ATTRIBUTES = [
  'id', 'name', 'scientificName', 'adapterClass',
  'originClimate', 'difficultyLevel', 'shortDescription', 'imageUrl',
];

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.adapterClass) where.adapterClass = req.query.adapterClass;
    if (req.query.difficultyLevel) where.difficultyLevel = req.query.difficultyLevel;
    if (req.query.originClimate) where.originClimate = { [Op.iLike]: `%${req.query.originClimate}%` };
    if (req.query.q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.q}%` } },
        { scientificName: { [Op.iLike]: `%${req.query.q}%` } },
      ];
    }

    const species = await SpeciesProfile.findAll({
      where,
      attributes: CATALOG_ATTRIBUTES,
      order: [['name', 'ASC']],
    });
    res.json({ data: species });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const species = await SpeciesProfile.findByPk(req.params.id, {
      include: [
        { model: MedicinalProperty, attributes: ['id', 'category', 'description'] },
        { model: BioactiveCompound, attributes: ['id', 'name', 'value'] },
      ],
    });
    if (!species) return res.status(404).json({ error: 'NOT_FOUND', message: 'Especie no encontrada' });
    res.json(species);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/', requireMinRole('ADMIN'), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });

    const species = await SpeciesProfile.create(req.body);
    res.status(201).json(species);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/:id', requireMinRole('ADMIN'), async (req, res) => {
  try {
    const species = await SpeciesProfile.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'NOT_FOUND', message: 'Especie no encontrada' });

    await species.update(req.body);
    res.json(species);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/:id', requireMinRole('ADMIN'), async (req, res) => {
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
