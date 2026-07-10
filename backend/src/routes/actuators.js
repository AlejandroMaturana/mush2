import { Op } from 'sequelize';
import express from 'express';
import { Device, Actuator, CultivationCycle, Recipe } from '../models/index.js';
import { sendActuatorUpdate } from '../services/webSocketServer.js';
import { publishActuatorCommand } from '../services/mqttBridge.js';

const PHASE_SEQUENCE = ['INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'];

function getPhaseThresholds(recipe, phase) {
  switch (phase) {
    case 'INCUBATION':
      return {
        tempMin: parseFloat(recipe.incubationTempMin),
        tempMax: parseFloat(recipe.incubationTempMax),
        humMin: parseFloat(recipe.incubationHumMin),
        humMax: parseFloat(recipe.incubationHumMax),
        co2Max: recipe.incubationCo2Max,
      };
    case 'FRUITING':
      return {
        tempMin: parseFloat(recipe.fruitingTempMin),
        tempMax: parseFloat(recipe.fruitingTempMax),
        humMin: parseFloat(recipe.fruitingHumMin),
        humMax: parseFloat(recipe.fruitingHumMax),
        co2Max: recipe.fruitingCo2Max,
      };
    case 'MAINTENANCE':
      return {
        tempMin: parseFloat(recipe.maintenanceTempMin),
        tempMax: parseFloat(recipe.maintenanceTempMax),
        humMin: parseFloat(recipe.maintenanceHumMin),
        humMax: parseFloat(recipe.maintenanceHumMax),
        co2Max: recipe.maintenanceCo2Max,
      };
    default:
      return null;
  }
}

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
    console.error('[ACTUATORS] Error:', err);
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

    const device = await Device.findOrCreate({
      where: { deviceId },
      defaults: { deviceId, status: 'ONLINE' },
    }).then(([d]) => d);

    const [actuator] = await Actuator.findOrCreate({
      where: { deviceId: device.id, channel },
      defaults: { deviceId: device.id, channel, state: command, mode: 'REMOTE' },
    });

    await actuator.update({
      state: command,
      mode: 'REMOTE',
      lastCommand: `cmd_${Date.now()}`,
      lastSeen: new Date(),
    });

    sendActuatorUpdate(deviceId, [{
      channel,
      state: command,
      mode: 'REMOTE',
    }]);
    publishActuatorCommand(deviceId, [{
      channel,
      state: command,
      mode: 'REMOTE',
    }]);

    res.json({
      channel: actuator.channel,
      state: actuator.state,
      mode: actuator.mode,
    });
  } catch (err) {
    console.error('[ACTUATOR] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
