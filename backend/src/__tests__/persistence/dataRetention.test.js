import { describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import sequelize from '../../config/database.js';
import { User, Device, Subscription, Telemetry, Alarm, AuditLog } from '../../models/index.js';
import { purgeExpiredData } from '../../services/dataRetentionService.js';

jest.setTimeout(30000);

const HAS_TEST_DB = /mush2_test/.test(process.env.DATABASE_URL || '');
const itDb = HAS_TEST_DB ? it : it.skip;

describe('ISSUE-010: retención per-dispositivo (requiere DATABASE_URL mush2_test)', () => {
  let freeUser;
  let premUser;
  let deviceFree;
  let devicePrem;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    freeUser = await User.create({
      username: 'prd-free',
      email: 'prd-free@test.local',
      passwordHash: bcrypt.hashSync('Pass1234!', 8),
      role: 'OPERATOR',
    });
    premUser = await User.create({
      username: 'prd-prem',
      email: 'prd-prem@test.local',
      passwordHash: bcrypt.hashSync('Pass1234!', 8),
      role: 'OPERATOR',
    });

    await Subscription.createForUser(freeUser.id, 'FREE');
    await Subscription.createForUser(premUser.id, 'PREMIUM');

    deviceFree = await Device.create({ deviceId: 'prd-dev-free', userId: freeUser.id });
    devicePrem = await Device.create({ deviceId: 'prd-dev-prem', userId: premUser.id });

    const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 40 days old: FREE (30d) → must be purged; PREMIUM (365d) → must be kept
    await Telemetry.create({ deviceId: deviceFree.id, sensorType: 'TEMPERATURE', value: 21, unit: '°C', timestamp: daysAgo(40) });
    await Telemetry.create({ deviceId: devicePrem.id, sensorType: 'TEMPERATURE', value: 22, unit: '°C', timestamp: daysAgo(40) });
    // 400 days old: beyond PREMIUM retention too → must be purged
    await Telemetry.create({ deviceId: devicePrem.id, sensorType: 'HUMIDITY', value: 60, unit: '%', timestamp: daysAgo(400) });

    await Alarm.create({ deviceId: deviceFree.id, type: 'OUT_OF_RANGE', severity: 'HIGH', message: 'free-old', createdAt: daysAgo(40) });
    await Alarm.create({ deviceId: devicePrem.id, type: 'OUT_OF_RANGE', severity: 'HIGH', message: 'prem-old', createdAt: daysAgo(40) });

    await AuditLog.create({ userId: freeUser.id, action: 'TEST', resource: 'retention', createdAt: daysAgo(40) });
    await AuditLog.create({ userId: premUser.id, action: 'TEST', resource: 'retention', createdAt: daysAgo(40) });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  itDb('I010: FREE device pierde 40d de telemetry; PREMIUM conserva 40d y pierde 400d', async () => {
    await purgeExpiredData();

    expect(await Telemetry.count({ where: { deviceId: deviceFree.id } })).toBe(0);
    expect(await Telemetry.count({ where: { deviceId: devicePrem.id } })).toBe(1);

    const remainingPrem = await Telemetry.findAll({ where: { deviceId: devicePrem.id } });
    expect(remainingPrem[0].sensorType).toBe('TEMPERATURE');
  });

  itDb('I010: alarmas y audit logs se purgan con el cutoff de su dueño', async () => {
    await purgeExpiredData();

    expect(await Alarm.count({ where: { deviceId: deviceFree.id } })).toBe(0);
    expect(await Alarm.count({ where: { deviceId: devicePrem.id } })).toBe(1);

    expect(await AuditLog.count({ where: { userId: freeUser.id } })).toBe(0);
    expect(await AuditLog.count({ where: { userId: premUser.id } })).toBe(1);
  });
});
