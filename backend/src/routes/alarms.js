import express from 'express';
import { Op } from 'sequelize';
import { Alarm, Device } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { severity, status, deviceId, page = 1, limit = 50 } = req.query;
    const where = {};

    if (severity) where.severity = severity.toUpperCase();
    if (status === 'active') where.resolvedAt = null;
    if (status === 'resolved') where.resolvedAt = { [Op.ne]: null };
    if (deviceId) where.deviceId = deviceId;

    if (req.tenant && req.tenant.userId) {
      const accessibleDevices = await Device.findAll({
        attributes: ['id'],
        include: [{
          association: 'UserChamberAccesses',
          where: { userId: req.tenant.userId },
          required: true,
          attributes: [],
        }],
      });
      where.deviceId = { [Op.in]: accessibleDevices.map(d => d.id) };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Alarm.findAndCountAll({
      where,
      include: [
        { model: Device, attributes: ['deviceId', 'chamberName', 'status'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    console.error('[ALARMS] Error listing:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const where = { resolvedAt: null };

    if (req.tenant && req.tenant.userId) {
      const accessibleDevices = await Device.findAll({
        attributes: ['id'],
        include: [{
          association: 'UserChamberAccesses',
          where: { userId: req.tenant.userId },
          required: true,
          attributes: [],
        }],
      });
      where.deviceId = { [Op.in]: accessibleDevices.map(d => d.id) };
    }

    const [critical, high, medium, low] = await Promise.all([
      Alarm.count({ where: { ...where, severity: 'CRITICAL' } }),
      Alarm.count({ where: { ...where, severity: 'HIGH' } }),
      Alarm.count({ where: { ...where, severity: 'MEDIUM' } }),
      Alarm.count({ where: { ...where, severity: 'LOW' } }),
    ]);

    res.json({ data: { critical, high, medium, low, total: critical + high + medium + low } });
  } catch (err) {
    console.error('[ALARMS] Error stats:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const alarm = await Alarm.findByPk(req.params.id);
    if (!alarm) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Alarma no encontrada' });
    }
    if (alarm.resolvedAt) {
      return res.status(400).json({ error: 'Alarma ya resuelta' });
    }

    await alarm.update({
      isAcknowledged: true,
      acknowledgedBy: req.user.id,
      acknowledgedAt: new Date(),
    });

    res.json({ data: alarm });
  } catch (err) {
    console.error('[ALARMS] Error acknowledge:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id/resolve', authenticate, async (req, res) => {
  try {
    const alarm = await Alarm.findByPk(req.params.id);
    if (!alarm) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Alarma no encontrada' });
    }
    if (alarm.resolvedAt) {
      return res.status(400).json({ error: 'Alarma ya resuelta' });
    }

    await alarm.update({
      resolvedAt: new Date(),
      metadata: { ...alarm.metadata, resolvedBy: req.user.id },
    });

    res.json({ data: alarm });
  } catch (err) {
    console.error('[ALARMS] Error resolve:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
