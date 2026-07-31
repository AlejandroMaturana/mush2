import crypto from 'crypto';
import { Op } from 'sequelize';
import express from 'express';
import { Device, Actuator, CultivationCycle, Recipe } from '../models/index.js';
import { sendActuatorUpdate } from '../services/webSocketServer.js';
import { publishActuatorCommand } from '../services/mqttBridge.js';
import { getPhaseThresholds } from '../services/controlEngine.js';
import { createChildLogger } from '../config/pino.js';
import { recordOutgoing, recordIncoming } from '../services/deviceHealthService.js';

const log = createChildLogger('ACTUATORS');
const PHASE_SEQUENCE = ['INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'];

const router = express.Router();

router.get('/', async (req, res) => {
  res.set('Connection', 'close');
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId query param requerido' });
    }

    const device = await Device.findOne({ where: { deviceId } });
    if (!device) {
      return res.json({ deviceId, actuators: [], status: 'no_active_cycle' });
    }

    // El HTTP Poller confirma que el dispositivo está activo.
    // Actualizar lastSeen para que refleje actividad HTTP cuando MQTT no está disponible.
    recordIncoming(deviceId, 'status').catch(() => {});

    const actuators = await Actuator.findAll({ where: { deviceId: device.id } });
    const actuatorList = actuators.map(a => ({
      channel: a.channel,
      state: a.state,
      mode: a.mode,
    }));

    const activeCycle = await CultivationCycle.findOne({
      where: { deviceId: device.id, status: 'ACTIVE' },
      include: [{ model: Recipe }],
    });

    if (!activeCycle) {
      return res.json({
        status: 'no_active_cycle',
        deviceId,
        ssrActiveLow: device.ssrActiveLow,
        actuators: actuatorList,
      });
    }

    const thresholds = getPhaseThresholds(activeCycle.Recipe, activeCycle.currentPhase);

    res.json({
      status: 'active',
      deviceId,
      cycleId: activeCycle.id,
      phase: activeCycle.currentPhase,
      setpoints: thresholds ? {
        tempMin: thresholds.tempMin,
        tempMax: thresholds.tempMax,
        humMin: thresholds.humMin,
        humMax: thresholds.humMax,
        co2Max: thresholds.co2Max,
      } : null,
      ssrActiveLow: device.ssrActiveLow,
      actuators: actuatorList,
    });
  } catch (err) {
    log.error({ module: 'ACTUATORS', event: 'LIST_ERROR', error: err.message }, 'Error listing actuators');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:channel', async (req, res) => {
  try {
    const channel = parseInt(req.params.channel, 10);
    const { deviceId, command } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId requerido en body' });
    }
    if (!command || !['ON', 'OFF'].includes(command)) {
      return res.status(400).json({ error: 'command debe ser ON u OFF' });
    }
    if (channel < 1 || channel > 4) {
      return res.status(400).json({ error: 'channel debe ser 1-4' });
    }

    const device = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId },
    }).then(([d]) => d);

    const cmdId = crypto.randomUUID();

    const [actuator] = await Actuator.findOrCreate({
      where: { deviceId: device.id, channel },
      defaults: { deviceId: device.id, channel, state: command, mode: 'REMOTE' },
    });

    await actuator.update({
      state: command,
      mode: 'REMOTE',
      lastCommand: cmdId,
      lastSeen: new Date(),
      overrideUntil: new Date(Date.now() + 5 * 60 * 1000),
    });

    const cmds = [{
      channel,
      state: command,
      cmdId,
      source: 'api.manual',
      mode: 'REMOTE',
    }];

    sendActuatorUpdate(deviceId, cmds);
    publishActuatorCommand(deviceId, cmds);
    recordOutgoing(deviceId).catch(() => {});

    res.json({
      channel: actuator.channel,
      state: actuator.state,
      mode: actuator.mode,
      cmdId,
    });
  } catch (err) {
    log.error({ module: 'ACTUATOR', event: 'COMMAND_ERROR', error: err.message }, 'Error sending actuator command');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
