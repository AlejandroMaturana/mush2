import { Op } from 'sequelize';
import express from 'express';
import { Device, Telemetry, Actuator, UserChamberAccess, CultivationCycle, Recipe, IntegrationCredentials, DeviceHealth, DeviceMaintenance } from '../models/index.js';
import { checkDeviceAccess } from '../middlewares/tenant.js';
import { logAudit } from '../services/auditService.js';
import { sendActuatorUpdate } from '../services/webSocketServer.js';
import { publishActuatorCommand } from '../services/mqttBridge.js';

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

    const { deviceId, macAddress, chamberName, chamberLocation, chamberId, firmwareVersion, hwRevision } = req.body;
    if (!deviceId || !macAddress) {
      return res.status(400).json({ error: 'deviceId y macAddress requeridos' });
    }

    const [device, created] = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, macAddress, userId: req.user.id, chamberName, chamberLocation, chamberId, firmwareVersion, hwRevision, status: 'ONLINE' },
    });

    if (!created) {
      const updates = { userId: req.user.id };
      if (macAddress) updates.macAddress = macAddress;
      if (chamberName !== undefined) updates.chamberName = chamberName;
      if (chamberLocation !== undefined) updates.chamberLocation = chamberLocation;
      if (chamberId !== undefined) updates.chamberId = chamberId;
      if (firmwareVersion) updates.firmwareVersion = firmwareVersion;
      if (hwRevision) updates.hwRevision = hwRevision;
      await device.update(updates);
    }

    await UserChamberAccess.upsert({
      userId: req.user.id,
      deviceId: device.id,
      role: 'OWNER',
      invitedBy: req.user.id,
      acceptedAt: new Date(),
    });

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

router.post('/devices/register', async (req, res) => {
  try {
    const { deviceId, macAddress, firmwareVersion, hwRevision } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId requerido' });
    }

    const [device, created] = await Device.findOrCreate({
      where: { deviceId },
      defaults: {
        deviceId,
        macAddress: macAddress || deviceId,
        firmwareVersion: firmwareVersion || '0.0.0',
        hwRevision: hwRevision || '',
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

    if (!created) {
      const updates = { status: 'ONLINE', lastSeen: new Date() };
      if (macAddress) updates.macAddress = macAddress;
      if (firmwareVersion) updates.firmwareVersion = firmwareVersion;
      if (hwRevision) updates.hwRevision = hwRevision;
      await device.update(updates);
    }

    console.log(`[REGISTER] Dispositivo ${created ? 'registrado' : 'actualizado'}: ${deviceId}`);
    res.status(created ? 201 : 200).json({ data: device });
  } catch (err) {
    console.error('[REGISTER] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/devices/:id/claim', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const device = await Device.findByPk(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Dispositivo no encontrado' });
    }

    if (device.userId) {
      return res.status(409).json({ error: 'El dispositivo ya tiene un dueño asignado' });
    }

    const { chamberName, chamberLocation, chamberId } = req.body;
    const updates = { userId: req.user.id };
    if (chamberName !== undefined) updates.chamberName = chamberName;
    if (chamberLocation !== undefined) updates.chamberLocation = chamberLocation;
    if (chamberId !== undefined) updates.chamberId = chamberId;
    await device.update(updates);

    await UserChamberAccess.upsert({
      userId: req.user.id,
      deviceId: device.id,
      role: 'OWNER',
      invitedBy: req.user.id,
      acceptedAt: new Date(),
    });

    await logAudit({
      userId: req.user.id,
      action: 'DEVICE_CLAIM',
      resource: 'device',
      resourceId: device.id,
      details: { deviceId: device.deviceId },
    });

    res.json({ data: device, message: 'Dispositivo reclamado exitosamente' });
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
    const allowed = ['chamberName', 'chamberLocation', 'chamberId', 'ssrActiveLow', 'firmwareVersion', 'hwRevision', 'thingSpeakEnabled', 'thingSpeakChannelId', 'thingSpeakReadKey', 'thingSpeakWriteKey', 'thingSpeakSyncInterval'];
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

router.get('/devices/:id/cycle', checkDeviceAccess, async (req, res) => {
  try {
    const cycle = await CultivationCycle.findOne({
      where: { deviceId: req.params.id, status: 'ACTIVE' },
      include: [{ model: Recipe }],
    });
    res.json({ data: cycle });
  } catch (err) {
    console.error('[DEVICES] Error fetching cycle:', err);
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
    const { sensorType, from, to, limit = 8000, resolution } = req.query;
    const deviceId = req.params.id;
    const limitNum = parseInt(limit, 10);

    if (resolution && parseInt(resolution) > 0) {
      const resMin = parseInt(resolution);
      let bucketExpr;
      if (resMin < 60) {
        bucketExpr = `date_trunc('hour', t."timestamp") + INTERVAL '1 minute' * FLOOR(EXTRACT(MINUTE FROM t."timestamp") / ${resMin}) * ${resMin}`;
      } else if (resMin === 60) {
        bucketExpr = `date_trunc('hour', t."timestamp")`;
      } else {
        bucketExpr = `date_trunc('day', t."timestamp")`;
      }

      const params = [deviceId];
      if (from) params.push(new Date(from));
      if (to) params.push(new Date(to));
      const rangeClause = from ? ` AND t."timestamp" >= $2` : '';
      const rangeClause2 = to ? ` AND t."timestamp" <= $${from ? 3 : 2}` : '';

      const [rows] = await Telemetry.sequelize.query(`
        SELECT ${bucketExpr} AS bucket,
               t."sensorType",
               ROUND(AVG(t.value)::numeric, 2) AS value,
               MAX(t.unit) AS unit
        FROM telemetry t
        WHERE t."deviceId" = $1${rangeClause}${rangeClause2}
        GROUP BY bucket, t."sensorType", t."unit"
        ORDER BY bucket DESC, t."sensorType" ASC
        LIMIT ${limitNum}
      `, { bind: params });

      const data = rows.reverse().map(r => ({
        id: `${r.sensorType}_${r.bucket}`,
        deviceId,
        sensorType: r.sensorType,
        value: parseFloat(r.value),
        unit: r.unit,
        timestamp: r.bucket,
      }));

      return res.json({ data });
    }

    const where = { deviceId };
    if (sensorType) where.sensorType = sensorType.toUpperCase();
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    const data = await Telemetry.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: limitNum,
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/health', checkDeviceAccess, async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    const where = { deviceId: req.params.id };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    const data = await DeviceHealth.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit, 10),
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/health/latest', checkDeviceAccess, async (req, res) => {
  try {
    const latest = await DeviceHealth.findOne({
      where: { deviceId: req.params.id },
      order: [['timestamp', 'DESC']],
    });
    res.json(latest || {});
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

    sendActuatorUpdate(device.deviceId, [{
      channel,
      state: command === 'ON' ? 'ON' : 'OFF',
      mode: 'REMOTE',
    }]);
    publishActuatorCommand(device.deviceId, [{
      channel,
      state: command === 'ON' ? 'ON' : 'OFF',
      mode: 'REMOTE',
    }]);

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

router.post('/devices/:id/thingSpeak/validate', checkDeviceAccess, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey requerida' });
    }

    const host = process.env.TS_HOST || 'api.thingspeak.com';
    const response = await fetch(`https://${host}/channels.json?api_key=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'API key inválida o expirada', valid: false });
    }

    const channels = await response.json();
    const channelList = channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      readKey: ch.api_keys?.find(k => k.read_flag && !k.write_flag)?.api_key || null,
      writeKey: ch.api_keys?.find(k => k.write_flag && !k.read_flag)?.api_key || null,
      lastEntryId: ch.last_entry_id,
      createdAt: ch.created_at,
    }));

    res.json({ valid: true, channels: channelList });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Timeout al conectar con ThingSpeak' });
    }
    res.status(500).json({ error: 'Error validando ThingSpeak', details: err.message });
  }
});

router.get('/devices/:id/integrations', checkDeviceAccess, async (req, res) => {
  try {
    const list = await IntegrationCredentials.findAll({
      where: { deviceId: req.params.id },
      attributes: ['id', 'provider', 'status', 'lastUsed', 'lastError', 'createdAt', 'updatedAt'],
    });
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/devices/:id/integrations/thingspeak', checkDeviceAccess, async (req, res) => {
  try {
    const { channelId, readKey, writeKey, syncInterval } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId requerido' });
    }

    const instance = await IntegrationCredentials.setCredentials(req.params.id, 'THINGSPEAK', {
      channelId,
      readKey: readKey || '',
      writeKey: writeKey || '',
      syncInterval: syncInterval || 300000,
    });

    await Device.update({
      thingSpeakEnabled: true,
      thingSpeakChannelId: channelId,
      thingSpeakReadKey: readKey || null,
      thingSpeakWriteKey: writeKey || null,
      thingSpeakSyncInterval: syncInterval || 300000,
    }, { where: { id: req.params.id } });

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'INTEGRATION_UPDATE',
        resource: 'integration',
        resourceId: instance.id,
        details: { deviceId: req.device.deviceId, provider: 'THINGSPEAK' },
      });
    }

    res.json({ data: { id: instance.id, provider: 'THINGSPEAK', status: instance.status } });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/maintenance', checkDeviceAccess, async (req, res) => {
  try {
    const { component, from, to, limit = 100 } = req.query;
    const where = { deviceId: req.params.id };
    if (component) where.component = component;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    const data = await DeviceMaintenance.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit, 10),
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/maintenance/latest', checkDeviceAccess, async (req, res) => {
  try {
    const latest = await DeviceMaintenance.findAll({
      where: { deviceId: req.params.id },
      order: [['timestamp', 'DESC']],
      group: ['component'],
      attributes: [
        'component',
        [DeviceMaintenance.sequelize.fn('MAX', DeviceMaintenance.sequelize.col('health')), 'health'],
        [DeviceMaintenance.sequelize.fn('MAX', DeviceMaintenance.sequelize.col('timestamp')), 'timestamp'],
      ],
    });
    res.json({ data: latest });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
