import sequelize from '../config/database.js';
import { Device, UserChamberAccess } from '../models/index.js';

async function backfill() {
  try {
    await sequelize.authenticate();
    console.log('[Backfill] DB conectada');

    const devices = await Device.findAll({
      where: { userId: { [sequelize.Sequelize.Op.ne]: null } },
    });

    let created = 0;
    let skipped = 0;

    for (const device of devices) {
      const existing = await UserChamberAccess.findOne({
        where: { userId: device.userId, deviceId: device.id },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await UserChamberAccess.create({
        userId: device.userId,
        deviceId: device.id,
        role: 'OWNER',
        invitedBy: device.userId,
        acceptedAt: new Date(),
      });
      created++;
      console.log(`  Creado acceso OWNER: user=${device.userId}, device=${device.id} (${device.deviceId})`);
    }

    console.log(`[Backfill] Completado: ${created} creados, ${skipped} ya existían`);
    await sequelize.close();
  } catch (err) {
    console.error('[Backfill] Error:', err);
    process.exit(1);
  }
}

backfill();
