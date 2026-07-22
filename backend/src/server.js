import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import sequelize from './config/database.js';
import { getReadiness, markServiceStarted, markServiceFailed, markReady } from './config/readiness.js';
import { installTimestampedConsole } from './services/logger.js';

installTimestampedConsole();

let tsSyncHandle = null;

async function start() {
  try {
    console.log(`[Process] Iniciando backend PID ${process.pid}`);

    // ── Critical path: DB authenticate + HTTP listen ────────────────
    await sequelize.authenticate();
    console.log('[DB] Conexión establecida');

    const httpServer = createServer(app);

    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[FATAL] Puerto ${env.PORT} ya en uso. Otro proceso lo está ocupando.`);
        console.error(`[FATAL] Para liberar el puerto:`);
        console.error(`         netstat -ano | findstr :${env.PORT}`);
        console.error(`         taskkill /PID <PID> /F`);
      } else {
        console.error('[FATAL] Error en HTTP server:', err);
      }
      process.exit(1);
    });

    httpServer.listen(env.PORT, () => {
      console.log(`[Server] Mush2 backend en puerto ${env.PORT}`);
      console.log('[Server] HTTP listen antes de servicios secundarios (TTFR optimizado)');

      // Sync + secondary services run AFTER listen — server is reachable immediately
      initSecondaryServices(httpServer);
    });
  } catch (err) {
    console.error('[FATAL] Error al iniciar:', err);
    process.exit(1);
  }
}

// ── Secondary services (non-blocking) ─────────────────────────────
async function initSecondaryServices(httpServer) {
  const TS_CHECK_INTERVAL = 60000;

  // Schema sync removed from startup — use `npm run db:sync` when schema changes are needed.
  // Running sync({ alter: true }) on every startup adds 5-10 minutes to boot and saturates the DB pool.
  markServiceStarted('dbSync');

  // WebSocket Server (needs httpServer reference)
  try {
    const { startWebSocketServer } = await import('./services/webSocketServer.js');
    startWebSocketServer(httpServer);
    markServiceStarted('webSocket');
    console.log('[Services] WebSocket Server started');
  } catch (err) {
    markServiceFailed('webSocket', err);
    console.error(`[Services] WebSocket Server failed: ${err.message}`);
  }

  // Control Engine
  try {
    const { startControlEngine } = await import('./services/controlEngine.js');
    startControlEngine();
    markServiceStarted('controlEngine');
    console.log('[Services] Control Engine started');
  } catch (err) {
    markServiceFailed('controlEngine', err);
    console.error(`[Services] Control Engine failed: ${err.message}`);
  }

  // MQTT Bridge
  try {
    const { startMqttBridge } = await import('./services/mqttBridge.js');
    startMqttBridge();
    markServiceStarted('mqttBridge');
    console.log('[Services] MQTT Bridge started');
  } catch (err) {
    markServiceFailed('mqttBridge', err);
    console.error(`[Services] MQTT Bridge failed: ${err.message}`);
  }

  // Telegram Bot
  try {
    const { initBot } = await import('./services/telegramService.js');
    const SystemSetting = (await import('./models/SystemSetting.js')).default;
    const [tgToken, tgUsername] = await Promise.all([
      SystemSetting.findOne({ where: { key: 'telegram_bot_token' } }),
      SystemSetting.findOne({ where: { key: 'telegram_bot_username' } }),
    ]);
    const botToken = tgToken?.value || env.TELEGRAM_BOT_TOKEN;
    const botUsername = tgUsername?.value || env.TELEGRAM_BOT_USERNAME;
    if (botToken) {
      await initBot(botToken, botUsername);
      markServiceStarted('telegram');
      console.log('[Services] Telegram Bot started');
    } else {
      markServiceStarted('telegram');
      console.log('[TELEGRAM] No token configured — bot disabled');
    }
  } catch (err) {
    markServiceFailed('telegram', err);
    console.error(`[Services] Telegram Bot failed: ${err.message}`);
  }

  // Wire up event bus listeners
  try {
    const { events } = await import('./services/eventBus.js');
    const { sendActuatorUpdate } = await import('./services/webSocketServer.js');
    const { publishActuatorCommand } = await import('./services/mqttBridge.js');

    events.on('control_eval', (data) => {
      if (!data.deviceId || !data.actuatorCommands) return;
      const cmds = data.actuatorCommands.map(c => ({ channel: c.channel, state: c.command, mode: 'REMOTE' }));
      sendActuatorUpdate(data.deviceId, cmds);
      const config = {};
      if (data.phase) config.phase = data.phase;
      if (data.thresholds) {
        config.setpoints = {
          tempMin: data.thresholds.tempMin,
          tempMax: data.thresholds.tempMax,
          humMin: data.thresholds.humMin,
          humMax: data.thresholds.humMax,
          co2Max: data.thresholds.co2Max,
        };
      }
      if (data.readings) config.readings = data.readings;
      publishActuatorCommand(data.deviceId, cmds, Object.keys(config).length > 0 ? config : null);
    });

    events.on('alarm', async (alarm) => {
      if (alarm.deviceId && !alarm.resolvedAt) {
        try {
          const { notifyDeviceAlarm } = await import('./services/telegramService.js');
          notifyDeviceAlarm(alarm.deviceId, alarm);
        } catch { /* telegram may not be configured */ }
      }
    });

    markServiceStarted('eventBus');
    console.log('[Services] Event bus listeners wired');
  } catch (err) {
    markServiceFailed('eventBus', err);
    console.error(`[Services] Event bus wiring failed: ${err.message}`);
  }

  // ThingSpeak Sync
  try {
    const { syncAllFromThingSpeak } = await import('./services/thingSpeakSync.js');
    syncAllFromThingSpeak().catch(() => {});
    tsSyncHandle = setInterval(() => syncAllFromThingSpeak().catch(() => {}), TS_CHECK_INTERVAL);
    markServiceStarted('thingSpeak');
    console.log(`[ThingSpeak] Sync check cada ${TS_CHECK_INTERVAL / 1000}s`);
  } catch (err) {
    markServiceFailed('thingSpeak', err);
    console.error(`[Services] ThingSpeak Sync failed: ${err.message}`);
  }

  // Background Jobs
  try {
    const { startDataRetentionJob } = await import('./jobs/dataRetentionJob.js');
    const { startOfflineWatchdog } = await import('./jobs/offlineWatchdog.js');
    startDataRetentionJob();
    startOfflineWatchdog();
    markServiceStarted('backgroundJobs');
    console.log('[Services] Background jobs started');
  } catch (err) {
    markServiceFailed('backgroundJobs', err);
    console.error(`[Services] Background jobs failed: ${err.message}`);
  }

  // All secondary services attempted — mark ready (may be degraded)
  markReady();
  const readiness = getReadiness();
  console.log(`[Server] Estado: ${readiness.status} — servicios: ${Object.keys(readiness.services).join(', ')}`);
}

start();

// ── Shutdown ──────────────────────────────────────────────────────
function shutdown(signal) {
  return async () => {
    console.log(`[Process] ${signal} — cerrando conexiones...`);
    try {
      if (tsSyncHandle) clearInterval(tsSyncHandle);
      const { stopControlEngine } = await import('./services/controlEngine.js');
      const { stopDataRetentionJob } = await import('./jobs/dataRetentionJob.js');
      const { stopOfflineWatchdog } = await import('./jobs/offlineWatchdog.js');
      const { stopBot } = await import('./services/telegramService.js');
      const { stopMqttBridge } = await import('./services/mqttBridge.js');
      const { stopWebSocketServer } = await import('./services/webSocketServer.js');
      stopControlEngine();
      stopDataRetentionJob();
      stopOfflineWatchdog();
      stopBot();
      stopMqttBridge();
      stopWebSocketServer();
      await sequelize.close();
      console.log('[DB] Conexión cerrada');
    } catch { /* ignore */ }
    process.exit(0);
  };
}

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  shutdown('uncaughtException')();
});

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
