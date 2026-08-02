/**
 * migrate-device-credentials.js
 *
 * One-time migration: generates per-device MQTT credentials for all existing
 * devices that don't have them yet. Updates Mosquitto password_file and DB.
 *
 * Usage: node src/scripts/migrate-device-credentials.js [--dry-run]
 */

import crypto from 'crypto';
import sequelize from '../config/database.js';
import Device from '../models/Device.js';
import MosquittoProvisioningService from '../services/mosquittoProvisioningService.js';

const isDryRun = process.argv.includes('--dry-run');
const provisioner = new MosquittoProvisioningService();

async function migrate() {
  await sequelize.authenticate();
  console.log('[MIGRATE] Connected to database');

  const devices = await Device.findAll();
  console.log(`[MIGRATE] Found ${devices.length} devices`);

  let provisioned = 0;
  let skipped = 0;
  let failed = 0;

  for (const device of devices) {
    if (device.mqttUser && device.mqttPassword) {
      console.log(`  [SKIP] ${device.deviceId} — already has credentials (${device.mqttUser})`);
      skipped++;
      continue;
    }

    const mqttUser = `dev_${device.deviceId}`;
    const mqttPass = crypto.randomBytes(24).toString('base64url');

    if (isDryRun) {
      console.log(`  [DRY-RUN] ${device.deviceId} → user=${mqttUser}`);
      provisioned++;
      continue;
    }

    console.log(`  [PROVISION] ${device.deviceId} → user=${mqttUser}`);

    const provResult = await provisioner.provisionDevice(device.deviceId, mqttUser, mqttPass);
    if (!provResult.ok) {
      console.error(`    [ERROR] Failed to provision MQTT user: ${provResult.error}`);
      failed++;
      continue;
    }

    await device.update({ mqttUser, mqttPassword: mqttPass });
    provisioned++;
  }

  if (!isDryRun && provisioned > 0) {
    console.log('\n[MIGRATE] Restarting Mosquitto to apply new credentials...');
    const reloadResult = await provisioner.reload();
    if (reloadResult.ok) {
      console.log('[MIGRATE] Mosquitto restarted successfully');
    } else {
      console.error(`[MIGRATE] Failed to restart Mosquitto: ${reloadResult.error}`);
    }
  }

  console.log(`\n[MIGRATE] Done. Provisioned: ${provisioned}, Skipped: ${skipped}, Failed: ${failed}`);
  await sequelize.close();
  process.exit(failed > 0 ? 1 : 0);
}

migrate().catch(err => {
  console.error('[MIGRATE] Fatal error:', err);
  process.exit(1);
});
