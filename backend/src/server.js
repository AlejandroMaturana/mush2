import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { validate, getConfigSummary } from './config/ConfigurationService.js';
import sequelize from './config/database.js';
import { getReadiness, markServiceStarted, markServiceFailed, markReady } from './config/readiness.js';
import logger, { createChildLogger } from './config/pino.js';

const log = createChildLogger('SERVER');

let tsSyncHandle = null;

async function start() {
  try {
    log.info({ event: 'STARTING', pid: process.pid }, 'Iniciando backend');

    // ── Fail-fast configuration validation (ADR-029) ──────────────
    const configResult = validate(env);
    log.info({ event: 'CONFIG_VALIDATED', ...configResult }, 'Configuracion validada');
    log.info({ event: 'CONFIG_SUMMARY', ...getConfigSummary(env) }, 'Configuracion actual');

    // ── Critical path: DB authenticate + HTTP listen ────────────────
    await sequelize.authenticate();
    log.info({ module: 'DB', event: 'CONNECTED' }, 'Conexion establecida');

    const httpServer = createServer(app);

    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log.fatal({ event: 'PORT_IN_USE', port: env.PORT }, `Puerto ${env.PORT} ya en uso`);
        log.fatal({ event: 'PORT_IN_USE_HINT' }, `netstat -ano | findstr :${env.PORT}`);
        log.fatal({ event: 'PORT_IN_USE_HINT' }, `taskkill /PID <PID> /F`);
      } else {
        log.fatal({ event: 'HTTP_ERROR', error: err.message }, 'Error en HTTP server');
      }
      process.exit(1);
    });

    httpServer.listen(env.PORT, () => {
      log.info({ event: 'LISTENING', port: env.PORT }, `Mush2 backend en puerto ${env.PORT}`);
      log.info({ event: 'LISTENING', detail: 'HTTP listen antes de servicios secundarios (TTFR optimizado)' });

      // Sync + secondary services run AFTER listen — server is reachable immediately
      initSecondaryServices(httpServer);
    });
  } catch (err) {
    log.fatal({ event: 'STARTUP_ERROR', error: err.message }, 'Error al iniciar');
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
    log.info({ module: 'WS', event: 'STARTED' }, 'WebSocket Server started');
  } catch (err) {
    markServiceFailed('webSocket', err);
    log.error({ module: 'WS', event: 'FAILED', error: err.message }, 'WebSocket Server failed');
  }

  // Control Engine
  try {
    const { startControlEngine } = await import('./services/controlEngine.js');
    startControlEngine();
    markServiceStarted('controlEngine');
    log.info({ module: 'CONTROL', event: 'STARTED' }, 'Control Engine started');
  } catch (err) {
    markServiceFailed('controlEngine', err);
    log.error({ module: 'CONTROL', event: 'FAILED', error: err.message }, 'Control Engine failed');
  }

  // MQTT Bridge
  try {
    const { startMqttBridge } = await import('./services/mqttBridge.js');
    startMqttBridge();
    markServiceStarted('mqttBridge');
    log.info({ module: 'MQTT', event: 'STARTED' }, 'MQTT Bridge started');
  } catch (err) {
    markServiceFailed('mqttBridge', err);
    log.error({ module: 'MQTT', event: 'FAILED', error: err.message }, 'MQTT Bridge failed');
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
      log.info({ module: 'TELEGRAM', event: 'STARTED' }, 'Telegram Bot started');
    } else {
      markServiceStarted('telegram');
      log.info({ module: 'TELEGRAM', event: 'DISABLED' }, 'No token configured — bot disabled');
    }
  } catch (err) {
    markServiceFailed('telegram', err);
    log.error({ module: 'TELEGRAM', event: 'FAILED', error: err.message }, 'Telegram Bot failed');
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
          const { notifyAlarm } = await import('./services/notifications/notificationService.js');
          await notifyAlarm(alarm);
        } catch { /* notification may not be configured */ }
      }
    });

    const { broadcastMonitoringEvent } = await import('./routes/monitoring.js');
    events.on('telemetry', (data) => {
      broadcastMonitoringEvent({ type: 'telemetry', deviceId: data.deviceId, ts: Date.now() });
    });
    events.on('health', (data) => {
      broadcastMonitoringEvent({ type: 'health', deviceId: data.deviceId, ts: Date.now() });
    });
    events.on('alarm', (alarm) => {
      broadcastMonitoringEvent({ type: 'alarm', deviceId: alarm.deviceId, ts: Date.now() });
    });

    markServiceStarted('eventBus');
    log.info({ module: 'EVENTBUS', event: 'WIRED' }, 'Event bus listeners wired');
  } catch (err) {
    markServiceFailed('eventBus', err);
    log.error({ module: 'EVENTBUS', event: 'FAILED', error: err.message }, 'Event bus wiring failed');
  }

  // ThingSpeak Sync
  try {
    const { syncAllFromThingSpeak } = await import('./services/thingSpeakSync.js');
    syncAllFromThingSpeak().catch(() => {});
    tsSyncHandle = setInterval(() => syncAllFromThingSpeak().catch(() => {}), TS_CHECK_INTERVAL);
    markServiceStarted('thingSpeak');
    log.info({ module: 'TS', event: 'STARTED', interval: TS_CHECK_INTERVAL / 1000 }, 'ThingSpeak Sync check');
  } catch (err) {
    markServiceFailed('thingSpeak', err);
    log.error({ module: 'TS', event: 'FAILED', error: err.message }, 'ThingSpeak Sync failed');
  }

  // Background Jobs
  try {
    const { startDataRetentionJob } = await import('./jobs/dataRetentionJob.js');
    const { startOfflineWatchdog } = await import('./jobs/offlineWatchdog.js');
    startDataRetentionJob();
    startOfflineWatchdog();
    markServiceStarted('backgroundJobs');
    log.info({ module: 'JOBS', event: 'STARTED' }, 'Background jobs started');
  } catch (err) {
    markServiceFailed('backgroundJobs', err);
    log.error({ module: 'JOBS', event: 'FAILED', error: err.message }, 'Background jobs failed');
  }

  // All secondary services attempted — mark ready (may be degraded)
  markReady();
  const readiness = getReadiness();
  log.info({ event: 'READY', status: readiness.status, services: Object.keys(readiness.services) }, 'Estado final');
}

start();

// ── Shutdown ──────────────────────────────────────────────────────
function shutdown(signal) {
  return async () => {
    log.info({ event: 'SHUTDOWN', signal }, 'Cerrando conexiones');
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
      log.info({ module: 'DB', event: 'CLOSED' }, 'Conexión cerrada');
    } catch { /* ignore */ }
    process.exit(0);
  };
}

process.on('unhandledRejection', (reason) => {
  log.fatal({ event: 'UNHANDLED_REJECTION', error: String(reason) }, 'Unhandled Rejection');
});
process.on('uncaughtException', (err) => {
  log.fatal({ event: 'UNCAUGHT_EXCEPTION', error: err.message, stack: err.stack }, 'Uncaught Exception');
  shutdown('uncaughtException')();
});

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
