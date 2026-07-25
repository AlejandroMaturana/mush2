import { env } from '../config/env.js';
import { Device, Telemetry, Sensor, IntegrationCredentials } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';

const SENSOR_MAP = {
  field1: { type: 'TEMPERATURE', unit: '°C' },
  field2: { type: 'HUMIDITY', unit: '%' },
  field3: { type: 'CO2', unit: 'ppm' },
  field4: { type: 'VOC', unit: 'ppb' },
};
const log = createChildLogger('TS');

const lastSyncTimes = new Map();

async function fetchChannel(channelId, apiKey) {
  const url = `https://${env.TS.host}/channels/${channelId}/feeds/last.json?api_key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ThingSpeak HTTP ${res.status}`);
  return res.json();
}

export async function syncDeviceFromThingSpeak(deviceId) {
  try {
    const device = await Device.findByPk(deviceId);
    if (!device) {
      log.info({ event: 'DEVICE_NOT_FOUND', deviceId }, `Device ${deviceId} not found, skipping`);
      return;
    }

    if (!device.thingSpeakEnabled) return;

    const now = Date.now();
    const lastSync = lastSyncTimes.get(device.id) || 0;
    const interval = device.thingSpeakSyncInterval || 300000;
    if (now - lastSync < interval) return;

    let channelId = device.thingSpeakChannelId;
    let apiKey = device.thingSpeakReadKey;

    if (!channelId || !apiKey) {
      const creds = await IntegrationCredentials.findOne({
        where: { deviceId, provider: 'THINGSPEAK', status: 'ACTIVE' },
      });
      if (creds) {
        const decrypted = creds.getDecryptedCredentials();
        if (decrypted) {
          channelId = decrypted.channelId || channelId;
          apiKey = decrypted.readKey || apiKey;
        }
      }
    }

    if (!channelId || !apiKey) {
      log.info({ event: 'NO_KEYS', deviceId }, `No ThingSpeak keys for device ${deviceId}`);
      return;
    }

    const feed = await fetchChannel(channelId, apiKey);
    if (!feed || feed.channel_id == null) {
      log.info({ event: 'EMPTY_RESPONSE', channelId }, `Empty response for channel ${channelId}`);
      return;
    }

    const entryId = feed.entry_id;
    const createdAt = feed.created_at ? new Date(feed.created_at) : new Date();

    for (const [field, info] of Object.entries(SENSOR_MAP)) {
      const rawValue = feed[field];
      if (rawValue == null) continue;

      const value = parseFloat(rawValue);
      if (isNaN(value)) continue;

      const [sensor] = await Sensor.findOrCreate({
        where: { deviceId, type: info.type },
        defaults: { deviceId, type: info.type },
      });

      await Telemetry.create({
        deviceId,
        sensorId: sensor.id,
        value,
        sensorType: info.type,
        unit: info.unit,
        timestamp: createdAt,
      });
    }

    await device.update({ lastSeen: new Date() });
    lastSyncTimes.set(device.id, now);
    log.info({ event: 'SYNCED', deviceId }, `Synced ${deviceId} from ThingSpeak (entry ${entryId})`);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      log.error({ module: 'TS', event: 'TIMEOUT', deviceId }, `Timeout syncing device ${deviceId}`);
    } else {
      log.error({ module: 'TS', event: 'ERROR_SYNCING', error: err.message, deviceId }, `Error syncing device ${deviceId}`);
    }
  }
}

export async function syncAllFromThingSpeak() {
  const devices = await Device.findAll({
    where: {
      thingSpeakEnabled: true,
      thingSpeakChannelId: { [Device.sequelize.Op.ne]: null },
    },
  });

  for (const device of devices) {
    await syncDeviceFromThingSpeak(device.id);
  }
}
