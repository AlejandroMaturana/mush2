import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.development defaults first (safe defaults for development)
dotenv.config({ path: resolve(__dirname, '../../../.env.development') });

// Load .env overrides on top (local credentials, gitignored)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
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
    passwordFile: process.env.MOSQUITTO_PASSWORD_FILE || '',
    container: process.env.MOSQUITTO_CONTAINER || 'mush2-mosquitto',
    mosquittoPasswd: process.env.MOSQUITTO_PASSWD_PATH || 'mosquitto_passwd',
  },

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
