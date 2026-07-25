import { Op } from 'sequelize';
import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Device, Telemetry, Event, User, CultivationCycle, AuditLog } from '../models/index.js';
import sequelize from '../config/database.js';
import { getReadiness } from '../config/readiness.js';
import { getStatusFromDevice } from '../services/deviceHealthService.js';
import { readLogs } from '../services/logReaderService.js';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const rootPkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));

const router = Router();

router.get('/metrics', async (req, res) => {
  try {
    const readiness = getReadiness();
    const deviceCount = await Device.count();
    const devices = await Device.findAll({ attributes: ['status', 'lastSeen', 'heartbeatInterval', 'staleMultiplier', 'offlineMultiplier', 'maintenanceMode'] });
    const onlineDevices = devices.filter(d => getStatusFromDevice(d) === 'ONLINE').length;
    const telemetryCount = await Telemetry.count();
    const eventCount = await Event.count();
    const activeCycles = await CultivationCycle.count({ where: { status: 'ACTIVE' } });
    const userCount = await User.count();
    const auditCount = await AuditLog.count();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const telemetry24h = await Telemetry.count({ where: { timestamp: { [Op.gte]: last24h } } });

    res.json({
      timestamp: now.toISOString(),
      uptime: process.uptime(),
      version: backendPkg.version,
      versions: {
        backend: backendPkg.version,
        os: rootPkg.version,
      },
      readiness: {
        status: readiness.status,
        startedAt: readiness.startedAt,
        readyAt: readiness.readyAt,
        services: readiness.services,
      },
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

router.get('/logs', async (req, res) => {
  try {
    const { level, module, limit, offset } = req.query;
    const logs = await readLogs({
      level,
      module,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const sseClients = new Set();

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('data: {"type":"connected"}\n\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

export function broadcastMonitoringEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

export { sseClients };

export default router;
