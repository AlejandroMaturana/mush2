import { Op } from 'sequelize';
import express from 'express';
import { Device, Telemetry, Actuator } from '../models/index.js';
import { publishCommand } from '../services/mqttService.js';
import { checkDeviceAccess } from '../middlewares/tenant.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

router.get('/devices', async (req, res) => {
  try {
    const where = {};
    if (req.tenant && req.tenant.userId) {
      where[Op.or] = [
        { userId: req.tenant.userId },
        { userId: null },
      ];
    }
    const devices = await Device.findAll({ where, order: [['updatedAt', 'DESC']] });
    res.json({ data: devices });
  } catch (err) {
    console.error('[DEVICES] Error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/devices', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const { deviceId, macAddress, chamberName, chamberLocation } = req.body;
    if (!deviceId || !macAddress) {
      return res.status(400).json({ error: 'deviceId y macAddress requeridos' });
    }

    const [device, created] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, macAddress, userId: req.user.id, chamberName, chamberLocation, status: 'ONLINE' },
    });

    if (!created) {
      await device.update({ userId: req.user.id, chamberName: chamberName || device.chamberName });
    }

    await logAudit({
      userId: req.user.id,
      action: created ? 'DEVICE_REGISTER' : 'DEVICE_UPDATE',
      resource: 'device',
      resourceId: device.id,
      details: { deviceId, macAddress },
    });

    res.status(created ? 201 : 200).json({ data: device });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id', checkDeviceAccess, async (req, res) => {
  try {
    const device = await Device.findByPk(req.params.id, {
      include: [{ model: Actuator }],
    });
    if (!device) return res.status(404).json({ error: 'NOT_FOUND', message: 'Dispositivo no encontrado' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/devices/:id', checkDeviceAccess, async (req, res) => {
  try {
    const device = req.device;
    const allowed = ['chamberName', 'chamberLocation'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Sin campos válidos para actualizar' });
    }
    await device.update(updates);

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'DEVICE_UPDATE',
        resource: 'device',
        resourceId: device.id,
        details: updates,
      });
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/telemetry/latest', checkDeviceAccess, async (req, res) => {
  try {
    const [rows] = await Telemetry.sequelize.query(`
      SELECT DISTINCT ON (t."sensorType") t."sensorType", t.value, t.unit, t."timestamp"
      FROM telemetry t
      WHERE t."deviceId" = $1
      ORDER BY t."sensorType", t."timestamp" DESC
    `, { bind: [req.params.id] });

    const result = {};
    for (const row of rows) {
      result[row.sensorType.toLowerCase()] = parseFloat(row.value);
      result[`${row.sensorType.toLowerCase()}_unit`] = row.unit;
      result.ts = row.timestamp;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/telemetry', checkDeviceAccess, async (req, res) => {
  try {
    const { sensorType, from, to, limit = 100 } = req.query;
    const where = { deviceId: req.params.id };
    if (sensorType) where.sensorType = sensorType.toUpperCase();
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    const data = await Telemetry.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit, 10),
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/actuators', checkDeviceAccess, async (req, res) => {
  try {
    const actuators = await Actuator.findAll({ where: { deviceId: req.params.id } });
    res.json({ data: actuators });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/devices/:id/actuators/:channel', checkDeviceAccess, async (req, res) => {
  try {
    const device = req.device;
    const channel = parseInt(req.params.channel, 10);
    const { command } = req.body;

    if (!command || !['ON', 'OFF'].includes(command)) {
      return res.status(400).json({ error: 'VALIDATION', message: 'command debe ser ON u OFF' });
    }

    const ok = publishCommand(device.deviceId, { target: 'actuator', channel, command });
    if (!ok) {
      return res.status(503).json({ error: 'MQTT_DISCONNECTED', message: 'MQTT no conectado' });
    }

    const [actuator] = await Actuator.findOrCreate({
      where: { deviceId: device.id, channel },
      defaults: { deviceId: device.id, channel, state: command, mode: 'REMOTE' },
    });
    await actuator.update({
      state: command === 'ON' ? 'ON' : 'OFF',
      mode: 'REMOTE',
      lastCommand: `cmd_${Date.now()}`,
      lastSeen: new Date(),
    });

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'ACTUATOR_COMMAND',
        resource: 'actuator',
        resourceId: actuator.id,
        details: { deviceId: device.deviceId, channel, command },
      });
    }

    res.json(actuator);
  } catch (err) {
    console.error('[ACTUATOR] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/devices/:id', checkDeviceAccess, async (req, res) => {
  try {
    const device = req.device;
    await Actuator.destroy({ where: { deviceId: device.id } });
    await Telemetry.destroy({ where: { deviceId: device.id } });
    await device.destroy();

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'DEVICE_DELETE',
        resource: 'device',
        resourceId: device.id,
        details: { deviceId: device.deviceId },
      });
    }

    res.json({ message: 'Dispositivo eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
