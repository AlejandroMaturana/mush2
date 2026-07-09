import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import sequelize from './config/database.js';
import { startControlEngine, stopControlEngine } from './services/controlEngine.js';
import { startWebSocketServer, stopWebSocketServer, sendActuatorUpdate } from './services/webSocketServer.js';
import { startMqttBridge, stopMqttBridge, publishActuatorCommand } from './services/mqttBridge.js';
import { events } from './services/eventBus.js';
import { installTimestampedConsole } from './services/logger.js';
import { syncAllFromThingSpeak } from './services/thingSpeakSync.js';

installTimestampedConsole();

const TS_SYNC_INTERVAL = parseInt(process.env.TS_SYNC_INTERVAL || '300000', 10); // 5 min default
let tsSyncHandle = null;

async function start() {
  try {
    console.log(`[Process] Iniciando backend PID ${process.pid}`);

    await sequelize.authenticate();
    console.log('[DB] Conexión establecida');

    if (env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('[DB] Modelos sincronizados (alter sin drop)');
    }

    startControlEngine();
    startMqttBridge();

    const httpServer = createServer(app);
    startWebSocketServer(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`[Server] Mush2 backend en puerto ${env.PORT}`);

      if (env.TS.apiKey) {
        syncAllFromThingSpeak().catch(() => {});
        tsSyncHandle = setInterval(() => syncAllFromThingSpeak().catch(() => {}), TS_SYNC_INTERVAL);
        console.log(`[ThingSpeak] Sync activo cada ${TS_SYNC_INTERVAL / 1000}s`);
      }
    });

    const publishActuators = (data) => {
      if (!data.deviceId || !data.actuatorCommands) return;
      const cmds = data.actuatorCommands.map(c => ({ channel: c.channel, state: c.command, mode: 'REMOTE' }));
      sendActuatorUpdate(data.deviceId, cmds);
      publishActuatorCommand(data.deviceId, cmds);
    };

    events.on('control_eval', publishActuators);
  } catch (err) {
    console.error('[FATAL] Error al iniciar:', err);
    process.exit(1);
  }
}

start();

function shutdown(signal) {
  return async () => {
    console.log(`[Process] ${signal} — cerrando conexiones...`);
    try {
      if (tsSyncHandle) clearInterval(tsSyncHandle);
      stopControlEngine();
      stopMqttBridge();
      stopWebSocketServer();
      await sequelize.close();
      console.log('[DB] Conexión cerrada');
    } catch { /* ignore */ }
    process.exit(0);
  };
}

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
