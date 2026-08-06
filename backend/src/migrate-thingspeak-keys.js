import sequelize from './config/database.js';
import { IntegrationCredentials } from './models/index.js';
import { createChildLogger } from './config/pino.js';

const log = createChildLogger('MIGRATE_TS');

async function migrate() {
  const [rows] = await sequelize.query(`
    SELECT id, "thingSpeakReadKey", "thingSpeakWriteKey"
    FROM devices
    WHERE "thingSpeakReadKey" IS NOT NULL OR "thingSpeakWriteKey" IS NOT NULL
  `);

  let migrated = 0;
  for (const row of rows) {
    const existing = await IntegrationCredentials.findOne({
      where: { deviceId: row.id, provider: 'THINGSPEAK', status: 'ACTIVE' },
    });

    const current = existing ? (existing.getDecryptedCredentials() || {}) : {};
    const readKey = current.readKey || row.thingSpeakReadKey;
    const writeKey = current.writeKey || row.thingSpeakWriteKey;

    await IntegrationCredentials.setCredentials(row.id, 'THINGSPEAK', {
      readKey: readKey || '',
      writeKey: writeKey || '',
    });
    migrated += 1;
  }

  log.info({ event: 'MIGRATED', count: migrated }, `Migradas ${migrated} configs ThingSpeak a IntegrationCredentials`);
  await sequelize.close();
}

migrate().catch(async (err) => {
  console.error('[Migrate ThingSpeak] Error:', err.message || err);
  process.exit(1);
});
