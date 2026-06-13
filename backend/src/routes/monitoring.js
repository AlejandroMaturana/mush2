import { Router } from 'express';
import { Device, Telemetry, Event, User, CultivationCycle, AuditLog } from '../models/index.js';
import sequelize from '../config/database.js';
import { isMQTTConnected } from '../services/mqttService.js';
import os from 'os';

const router = Router();

router.get('/metrics', async (req, res) => {
  try {
    const deviceCount = await Device.count();
    const onlineDevices = await Device.count({ where: { status: 'ONLINE' } });
    const telemetryCount = await Telemetry.count();
    const eventCount = await Event.count();
    const activeCycles = await CultivationCycle.count({ where: { status: 'ACTIVE' } });
    const userCount = await User.count();
    const auditCount = await AuditLog.count();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const telemetry24h = await Telemetry.count({ where: { createdAt: { $gte: last24h } } });

    res.json({
      timestamp: now.toISOString(),
      uptime: process.uptime(),
      version: '0.7.0',
      mqtt: { connected: isMQTTConnected() },
      system: {
        memory: process.memoryUsage(),
        cpu: os.cpus().length,
        loadAvg: os.loadavg(),
        platform: os.platform(),
        nodeVersion: process.version,
      },
      db: {
        deviceCount,
        onlineDevices,
        telemetryCount,
        telemetry24h,
        eventCount,
        activeCycles,
        userCount,
        auditCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/health/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

router.get('/health/mqtt', async (req, res) => {
  res.json({ status: isMQTTConnected() ? 'ok' : 'degraded', mqtt: isMQTTConnected() ? 'connected' : 'disconnected' });
});

export default router;
