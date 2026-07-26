import { Router } from 'express';
import { Chamber, Device, CultivationCycle } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { migrateChambers } from '../scripts/migrate-chambers.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('CHAMBERS');
const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const chambers = await Chamber.findAll({
      include: [{ model: Device, attributes: ['id', 'deviceId', 'chamberName', 'lifecycle'] }],
      order: [['name', 'ASC']],
    });
    res.json({ data: chambers });
  } catch (err) {
    log.error({ module: 'CHAMBERS', event: 'LIST_ERROR', error: err.message }, 'Error listing chambers');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const chamber = await Chamber.findByPk(req.params.id, {
      include: [{ model: Device, attributes: ['id', 'deviceId', 'chamberName', 'lifecycle', 'lastSeen'] }],
    });
    if (!chamber) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: chamber });
  } catch (err) {
    log.error({ module: 'CHAMBERS', event: 'GET_ERROR', error: err.message }, 'Error getting chamber');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, volume, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Name requerido' });

    const chamber = await Chamber.create({
      name,
      volume: volume || null,
      location: location || null,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json({ data: chamber });
  } catch (err) {
    log.error({ module: 'CHAMBERS', event: 'CREATE_ERROR', error: err.message }, 'Error creating chamber');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const chamber = await Chamber.findByPk(req.params.id);
    if (!chamber) return res.status(404).json({ error: 'NOT_FOUND' });

    const allowed = ['name', 'volume', 'location'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedBy = req.user.id;

    await chamber.update(updates);
    res.json({ data: chamber });
  } catch (err) {
    log.error({ module: 'CHAMBERS', event: 'UPDATE_ERROR', error: err.message }, 'Error updating chamber');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/:id', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const chamber = await Chamber.findByPk(req.params.id);
    if (!chamber) return res.status(404).json({ error: 'NOT_FOUND' });

    const deviceCount = await Device.count({ where: { chamberId: chamber.id } });
    const cycleCount = await CultivationCycle.count({ where: { chamberId: chamber.id } });
    if (deviceCount > 0 || cycleCount > 0) {
      return res.status(400).json({
        error: 'Chamber tiene dispositivos o ciclos asociados',
        devices: deviceCount,
        cycles: cycleCount,
      });
    }

    await chamber.destroy();
    res.json({ message: 'Chamber eliminada' });
  } catch (err) {
    log.error({ module: 'CHAMBERS', event: 'DELETE_ERROR', error: err.message }, 'Error deleting chamber');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/migrate', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const chambers = await migrateChambers();
    res.json({ data: chambers, message: 'Migración completada' });
  } catch (err) {
    log.error({ module: 'CHAMBERS', event: 'MIGRATE_ERROR', error: err.message }, 'Error migrating chambers');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
