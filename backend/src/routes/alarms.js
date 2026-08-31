import express from 'express';
import { Op } from 'sequelize';
import { Alarm, Device } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { canAccessDevice } from '../middlewares/tenant.js';
import { createChildLogger } from '../config/pino.js';
import { explainAlarm } from '../services/alertTranslationService.js';

const log = createChildLogger('ALARMS');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { severity, status, deviceId, page = 1, limit = 50 } = req.query;
    const where = {};

    if (severity) where.severity = severity.toUpperCase();
    if (status === 'active') where.resolvedAt = null;
    if (status === 'resolved') where.resolvedAt = { [Op.ne]: null };

    // I012/PR-C — alinear tipos en el boundary: deviceId llega como string
    // (id INTEGER o deviceId del Device); se resuelve el Device y se filtra
    // por su id INTEGER, evitando comparar strings contra la columna INTEGER.
    if (deviceId) {
      const device = await Device.findOne({
        where: { [Op.or]: [{ id: deviceId }, { deviceId }] },
      });
      if (!device) {
        return res.json({ data: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } });
      }
      where.deviceId = device.id;
    }

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
        { model: Device, attributes: ['deviceId', 'chamberName', 'lifecycle'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // D3/T11 — Serialización aditiva: se derivan los 5 niveles en backend
    // (Single Source of Truth) y se adjuntan sin eliminar/renombrar campos.
    const data = rows.map((row) => {
      const plain = row.get({ plain: true });
      return { ...plain, ...explainAlarm(plain) };
    });

    res.json({
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    log.error({ module: 'ALARMS', event: 'LIST_ERROR', error: err.message }, 'Error listing alarms');
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
    log.error({ module: 'ALARMS', event: 'STATS_ERROR', error: err.message }, 'Error fetching alarm stats');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const alarm = await Alarm.findByPk(req.params.id);
    if (!alarm) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Alarma no encontrada' });
    }
    const device = await Device.findByPk(alarm.deviceId);
    if (!device || !(await canAccessDevice(req.user, device))) {
      return res.status(403).json({ error: 'Sin acceso a este dispositivo' });
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
    log.error({ module: 'ALARMS', event: 'ACKNOWLEDGE_ERROR', error: err.message }, 'Error acknowledging alarm');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id/resolve', authenticate, async (req, res) => {
  try {
    const alarm = await Alarm.findByPk(req.params.id);
    if (!alarm) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Alarma no encontrada' });
    }
    const device = await Device.findByPk(alarm.deviceId);
    if (!device || !(await canAccessDevice(req.user, device))) {
      return res.status(403).json({ error: 'Sin acceso a este dispositivo' });
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
    log.error({ module: 'ALARMS', event: 'RESOLVE_ERROR', error: err.message }, 'Error resolving alarm');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
