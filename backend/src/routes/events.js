import { Router } from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middlewares/auth.js';
import { canAccessDevice, getAccessibleDeviceIds } from '../middlewares/tenant.js';
import { Event, Device } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';

const logger = createChildLogger('EVENTS');
const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, deviceId, from, to } = req.query;
    let where = { deviceId: { [Op.in]: await getAccessibleDeviceIds(req.user.id) } };
    if (deviceId) {
      const device = await Device.findOne({
        where: { [Op.or]: [{ id: deviceId }, { deviceId }] },
      });
      if (!device || !(await canAccessDevice(req.user, device))) {
        return res.status(403).json({ error: 'Sin acceso a este dispositivo' });
      }
      where = { deviceId: device.id };
    }
    if (type) where.type = type;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Event.findAndCountAll({
      where,
      include: [{ model: Device, attributes: ['deviceId', 'chamberName'] }],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset,
    });
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    logger.error({ error: err.message }, 'Error listing events');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/device/:deviceId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, from, to } = req.query;
    const device = await Device.findOne({
      where: { [Op.or]: [{ id: req.params.deviceId }, { deviceId: req.params.deviceId }] },
    });
    if (!device || !(await canAccessDevice(req.user, device))) {
      return res.status(403).json({ error: 'Sin acceso a este dispositivo' });
    }
    const where = { deviceId: device.id };
    if (type) where.type = type;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Event.findAndCountAll({
      where,
      include: [{ model: Device, attributes: ['deviceId', 'chamberName'] }],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset,
    });
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    logger.error({ error: err.message }, 'Error listing events for device');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
