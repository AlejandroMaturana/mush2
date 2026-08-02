import sequelize from '../config/database.js';
import { Device, IntegrationCredentials } from '../models/index.js';

export async function migrateIntegrationCredentials() {
  console.log('[MIGRATE] Starting IntegrationCredentials migration...');

  const devices = await Device.findAll({
    where: { thingSpeakEnabled: true },
    attributes: ['id', 'deviceId', 'thingSpeakChannelId', 'thingSpeakReadKey', 'thingSpeakWriteKey', 'thingSpeakSyncInterval'],
  });

  let created = 0;
  let skipped = 0;

  for (const d of devices) {
    if (!d.thingSpeakChannelId) {
      skipped++;
      continue;
    }

    const existing = await IntegrationCredentials.findOne({
      where: { deviceId: d.id, provider: 'THINGSPEAK' },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await IntegrationCredentials.setCredentials(d.id, 'THINGSPEAK', {
      channelId: d.thingSpeakChannelId,
      readKey: d.thingSpeakReadKey || '',
      writeKey: d.thingSpeakWriteKey || '',
      syncInterval: d.thingSpeakSyncInterval || 300000,
    });

    created++;
    console.log(`[MIGRATE] Creado IntegrationCredentials para ${d.deviceId} (channel ${d.thingSpeakChannelId})`);
  }

  console.log(`[MIGRATE] Done: ${created} creados, ${skipped} omitidos`);
  return { created, skipped };
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('[MIGRATE] DB conectada');
    await IntegrationCredentials.sync({ alter: true });
    console.log('[MIGRATE] Tabla integration_credentials sincronizada');
    await migrateIntegrationCredentials();
    await sequelize.close();
  } catch (err) {
    console.error('[MIGRATE] Error:', err);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('migrate-integration-credentials.js')) {
  main();
}
