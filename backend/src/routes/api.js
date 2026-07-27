import { Op } from 'sequelize';
import crypto from 'crypto';
import express from 'express';
import { Device, Telemetry, Actuator, UserChamberAccess, CultivationCycle, CycleState, Recipe, IntegrationCredentials, DeviceHealth, DeviceMaintenance } from '../models/index.js';
import { checkDeviceAccess } from '../middlewares/tenant.js';
import { logAudit } from '../services/auditService.js';
import { sendActuatorUpdate } from '../services/webSocketServer.js';
import { publishActuatorCommand } from '../services/mqttBridge.js';
import { getHealthInfo, setMaintenanceMode, getStatusFromDevice, buildHealthPayload, getSecondsSinceLastSeen, getLatestHealth, recordOutgoing } from '../services/deviceHealthService.js';
import MosquittoProvisioningService from '../services/mosquittoProvisioningService.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('API');
const router = express.Router();
const mqttProvisioner = new MosquittoProvisioningService();

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
    const enriched = await Promise.all(devices.map(async d => {
      const json = d.toJSON();
      const latestHealth = await getLatestHealth(d.id);
      json.status = getStatusFromDevice(d, latestHealth);
      json.secondsSinceLastSeen = getSecondsSinceLastSeen(d);
      return json;
    }));
    res.json({ data: enriched });
  } catch (err) {
    log.error({ module: 'DEVICES', event: 'LIST_ERROR', error: err.message }, 'Error listing devices');
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
      defaults: { deviceId, macAddress, userId: req.user.id, chamberName, chamberLocation, chamberId, firmwareVersion, hwRevision },
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
        lastSeen: new Date(),
      },
    });

    let mqttCredentials = null;

    if (created || !device.mqttUser) {
      // ADR-028: Generate per-device MQTT credentials
      const mqttUser = `dev_${deviceId}`;
      const mqttPass = crypto.randomBytes(24).toString('base64url');

      const provResult = await mqttProvisioner.provisionDevice(deviceId, mqttUser, mqttPass);

      if (provResult.ok) {
        await device.update({ mqttUser, mqttPassword: mqttPass });
        mqttCredentials = { user: mqttUser, pass: mqttPass };
        log.info({ event: 'MQTT_PROVISIONED', deviceId, mqttUser }, `MQTT credentials generated for ${deviceId}`);
      } else {
        log.error({ event: 'MQTT_PROVISION_FAILED', deviceId, error: provResult.error }, 'Failed to provision MQTT credentials');
      }
    } else {
      // Existing device — just update lastSeen and firmware info
      const updates = { lastSeen: new Date() };
      if (macAddress) updates.macAddress = macAddress;
      if (firmwareVersion) updates.firmwareVersion = firmwareVersion;
      if (hwRevision) updates.hwRevision = hwRevision;
      await device.update(updates);
    }

    log.info({ event: 'DEVICE_REGISTERED', deviceId, created }, `Dispositivo ${created ? 'registrado' : 'actualizado'}: ${deviceId}`);

    const response = { data: device.toJSON() };
    if (mqttCredentials) {
      response.mqtt = mqttCredentials;
    }

    res.status(created ? 201 : 200).json(response);
  } catch (err) {
    log.error({ module: 'REGISTER', event: 'REGISTER_ERROR', error: err.message }, 'Error registering device');
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
    const json = device.toJSON();
    const latestHealth = await getLatestHealth(device.id);
    json.status = getStatusFromDevice(device, latestHealth);
    json.secondsSinceLastSeen = getSecondsSinceLastSeen(device);
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/devices/:id', checkDeviceAccess, async (req, res) => {
  try {
    const device = req.device;
    const allowed = ['chamberName', 'chamberLocation', 'chamberId', 'ssrActiveLow', 'firmwareVersion', 'hwRevision', 'thingSpeakEnabled', 'thingSpeakChannelId', 'thingSpeakReadKey', 'thingSpeakWriteKey', 'thingSpeakSyncInterval', 'heartbeatInterval', 'staleMultiplier', 'offlineMultiplier'];
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
    log.error({ module: 'DEVICES', event: 'CYCLE_FETCH_ERROR', error: err.message }, 'Error fetching cycle');
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
      overrideUntil: new Date(Date.now() + 5 * 60 * 1000),
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
    recordOutgoing(device.deviceId).catch(() => {});

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
    log.error({ module: 'ACTUATOR', event: 'COMMAND_ERROR', error: err.message }, 'Error sending actuator command');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/devices/:id/connectivity', checkDeviceAccess, async (req, res) => {
  try {
    const healthInfo = await getHealthInfo(req.device.deviceId);
    if (!healthInfo) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: healthInfo });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/devices/:id/maintenance', checkDeviceAccess, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled boolean required' });
    }
    const device = await setMaintenanceMode(req.device.deviceId, enabled);
    if (!device) return res.status(404).json({ error: 'NOT_FOUND' });

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: enabled ? 'MAINTENANCE_ENABLE' : 'MAINTENANCE_DISABLE',
        resource: 'device',
        resourceId: device.id,
        details: { deviceId: device.deviceId, maintenanceMode: enabled },
      });
    }

    res.json({ data: { deviceId: device.deviceId, maintenanceMode: enabled, lifecycle: device.lifecycle } });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/devices/:id/health-config', checkDeviceAccess, async (req, res) => {
  try {
    const { heartbeatInterval, staleMultiplier, offlineMultiplier } = req.body;
    const device = req.device;
    const updates = {};
    if (heartbeatInterval !== undefined) updates.heartbeatInterval = parseInt(heartbeatInterval, 10);
    if (staleMultiplier !== undefined) updates.staleMultiplier = parseInt(staleMultiplier, 10);
    if (offlineMultiplier !== undefined) updates.offlineMultiplier = parseInt(offlineMultiplier, 10);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await device.update(updates);
    res.json({ data: { deviceId: device.deviceId, ...updates } });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/devices/:id', checkDeviceAccess, async (req, res) => {
  try {
    const device = req.device;

    const cycles = await CultivationCycle.findAll({ where: { deviceId: device.id }, attributes: ['id'] });
    for (const cycle of cycles) {
      await CycleState.destroy({ where: { cycleId: cycle.id } });
    }
    await CultivationCycle.destroy({ where: { deviceId: device.id } });
    await Actuator.destroy({ where: { deviceId: device.id } });
    await Telemetry.destroy({ where: { deviceId: device.id } });
    await DeviceHealth.destroy({ where: { deviceId: device.id } });
    await DeviceMaintenance.destroy({ where: { deviceId: device.id } });
    await IntegrationCredentials.destroy({ where: { deviceId: device.id } });
    await UserChamberAccess.destroy({ where: { deviceId: device.id } });
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

router.post('/devices/:id/maintenance', checkDeviceAccess, async (req, res) => {
  try {
    const { type, component, notes, health, estimatedFailure } = req.body;
    const record = await DeviceMaintenance.create({
      deviceId: parseInt(req.params.id, 10),
      component: component || type || 'GENERAL',
      health: health || 100,
      estimatedFailure: estimatedFailure || null,
      reason: notes || null,
      timestamp: new Date(),
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
