import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { getMqttStatus, publishActuatorCommand } from '../services/mqttBridge.js';
import { Device, Actuator } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('DIAG');
const router = Router();

router.get('/mqtt', authenticate, async (req, res) => {
  try {
    const mqttStatus = getMqttStatus();
    const devices = await Device.findAll({
      include: [{ model: Actuator, attributes: ['channel', 'state', 'mode'] }],
    });
    const ssrChannels = devices.flatMap(d =>
      (d.Actuators || []).map(a => ({
        deviceId: d.deviceId,
        channel: a.channel,
        state: a.state,
        mode: a.mode,
      }))
    );
    res.json({
      data: {
        mqtt: mqttStatus,
        ssrChannels,
        chamberControlMode: devices.reduce((acc, d) => {
          acc[d.deviceId] = d.controlMode || 'AUTO';
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    log.error({ module: 'DIAG', event: 'MQTT_STATUS_ERROR', error: err.message }, 'Error reading MQTT status');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/mqtt/publish', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { deviceId, topic, payload } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId requerido' });

    const published = publishActuatorCommand(deviceId, [{ channel: 0, state: 'TEST', mode: 'DIAG' }]);
    res.json({
      data: { published, topic: topic || `mush2/${deviceId}/actuators`, payload: payload || { type: 'diagnostic_test' } },
      message: published ? 'Mensaje publicado' : 'No hay broker MQTT conectado',
    });
  } catch (err) {
    log.error({ module: 'DIAG', event: 'MQTT_PUBLISH_ERROR', error: err.message }, 'Error publishing MQTT');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
