import dotenv from 'dotenv';
import { resolve, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

// ── Detect NODE_ENV ────────────────────────────────────────────
// Priority: process.env.NODE_ENV > default 'development'.
//
// Production environments MUST set NODE_ENV explicitly (Render,
// Docker, shell). Never auto-detect from .env.* files — readdirSync
// order is non-deterministic and caused a regression when
// .env.production was scanned before .env.development.
const nodeEnv = process.env.NODE_ENV || 'development';

// ── Load .env (base — shared values across all environments) ──
dotenv.config({ path: resolve(ROOT, '.env') });

// ── Load .env.{NODE_ENV} (override — env-specific values) ─────
// `override: true` ensures env-specific values ALWAYS win over .env.
dotenv.config({
  path: resolve(ROOT, `.env.${nodeEnv}`),
  override: true,
});

// ── Environment-aware defaults for MQTT provisioning ──────────────
// Each environment has its own isolated password_file (ADR-029).
// Override with MOSQUITTO_PASSWORD_FILE env var.
//
// The password_file lives in the repo (docker/mosquitto/<env>/password_file)
// and is read by both the broker (mounted) and the provisioner. The dev
// backend runs with cwd = backend/, so relative values MUST resolve against
// the repo ROOT — otherwise provisioning fails with "password_file not found".
const mqttPasswordFile =
  nodeEnv === 'production'
    ? 'docker/mosquitto/prod/password_file'
    : 'docker/mosquitto/dev/password_file';

function resolveRepoPath(p) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(ROOT, p);
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '3797', 10),

  DB: {
    database: process.env.DB_NAME || 'mush2',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    url: process.env.DATABASE_URL,
  },

  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',

  TS: {
    host: process.env.TS_HOST || 'api.thingspeak.com',
    port: parseInt(process.env.TS_PORT || '80', 10),
  },

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'Mush2Bot',

  SMTP: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },

  MQTT: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_BROKER_USER || 'backend_bridge',
    password: process.env.MQTT_BROKER_PASS || '',
  },

  MQTT_PROVISIONING: {
    passwordFile: resolveRepoPath(process.env.MOSQUITTO_PASSWORD_FILE || mqttPasswordFile),
    container: process.env.MOSQUITTO_CONTAINER || 'mush2-mosquitto',
    mosquittoPasswd: process.env.MOSQUITTO_PASSWD_PATH || 'mosquitto_passwd',
  },

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_TIME_ZONE: process.env.LOG_TIME_ZONE || '',
};
