// Punto de entrada del Protocol Simulator (FASE 1).
//
// Flujo: config por env/flags → registro ADR-028 (con reintentos) → conexión
// MQTT (clientId = deviceId, requerido por las ACL pattern %c del broker) →
// VirtualDevice en espera de comandos.

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mqtt from 'mqtt';

import { loadConfig } from './config.js';
import { ensureCredentials } from './register.js';
import { VirtualDevice } from './device.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../.env') });

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function applyFlags(config, flags) {
  if (flags.deviceId) config.deviceId = flags.deviceId;
  if (flags.broker) config.brokerUrl = flags.broker;
  if (flags.api) config.apiUrl = flags.api.replace(/\/+$/, '');
  if (flags.interval) config.telemetryIntervalMs = parseInt(flags.interval, 10);
  if (flags.telemetry) config.telemetryMode = flags.telemetry === 'fixed' ? 'fixed' : 'drift';
  if (flags.seed) config.seed = parseInt(flags.seed, 10);
  return config;
}

async function withRetry(fn, { attempts = 5, delayMs = 2000, log = () => {} }) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log(`intento ${i}/${attempts} falló: ${err.message}`);
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, delayMs * i));
      }
    }
  }
  throw lastErr;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = applyFlags(loadConfig(), flags);

  const log = (msg) => console.log(msg);

  log(`[simulator] deviceId=${config.deviceId} broker=${config.brokerUrl} api=${config.apiUrl} telemetry=${config.telemetryMode}`);

  const creds = await withRetry(
    () => ensureCredentials(config, { log }),
    { log },
  );
  log(`[simulator] credenciales MQTT: source=${creds.source} user=${creds.user}`);

  const client = mqtt.connect(config.brokerUrl, {
    clientId: config.deviceId,
    username: creds.user,
    password: creds.pass,
    reconnectPeriod: config.reconnectPeriod,
    connectTimeout: 5000,
  });

  const device = new VirtualDevice({ config, mqttClient: client, log });

  const shutdown = async (signal) => {
    log(`[simulator] ${signal} recibido — apagando...`);
    await device.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await device.start();
  } catch (err) {
    log(`[simulator] error fatal: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[simulator] error fatal: ${err.message}`);
  process.exit(1);
});
