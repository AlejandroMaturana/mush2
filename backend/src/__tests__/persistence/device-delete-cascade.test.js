import { describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import sequelize from '../../config/database.js';
import { markReady } from '../../config/readiness.js';
import { User, Device, Event, Alarm, Sensor, Telemetry } from '../../models/index.js';

jest.setTimeout(30000);

beforeAll(() => markReady());

const HAS_TEST_DB = /mush2_test/.test(process.env.DATABASE_URL || '');
const itDb = HAS_TEST_DB ? it : it.skip;

describe('PR-C ISSUE-006/I012: DELETE /devices transaccional con cascada (requiere DATABASE_URL mush2_test)', () => {
  let user;
  let token;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    user = await User.create({
      username: 'prc-e2e',
      email: 'prc-e2e@test.local',
      passwordHash: bcrypt.hashSync('Pass1234!', 8),
      role: 'ADMIN',
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'prc-e2e', password: 'Pass1234!' });
    expect(login.status).toBe(200);
    token = login.body.token.accessToken;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  itDb('I006: borra Device con Event/Alarm/Sensor/Telemetry y no deja huérfanos', async () => {
    const device = await Device.create({
      deviceId: 'prc-device-1',
      macAddress: 'AA:BB:CC:DD:EE:01',
      userId: user.id,
    });
    await Event.create({ deviceId: device.id, type: 'SYSTEM_BOOT', payload: { boot: true }, timestamp: new Date() });
    await Alarm.create({ deviceId: device.id, type: 'OUT_OF_RANGE', severity: 'HIGH', message: 'a1' });
    await Sensor.create({ deviceId: device.id, type: 'TEMPERATURE', channel: 1 });
    await Telemetry.create({
      deviceId: device.id, sensorType: 'TEMPERATURE', value: 21.5, unit: '°C', timestamp: new Date(),
    });

    const res = await request(app)
      .delete(`/api/v1/devices/${device.deviceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(await Device.findByPk(device.id)).toBeNull();
    expect(await Event.count({ where: { deviceId: device.id } })).toBe(0);
    expect(await Alarm.count({ where: { deviceId: device.id } })).toBe(0);
    expect(await Sensor.count({ where: { deviceId: device.id } })).toBe(0);
    expect(await Telemetry.count({ where: { deviceId: device.id } })).toBe(0);
  });

  itDb('I012: filtro GET /events?deviceId=<id> devuelve los eventos del device', async () => {
    const device = await Device.create({
      deviceId: 'prc-device-2',
      macAddress: 'AA:BB:CC:DD:EE:02',
      userId: user.id,
    });
    await Event.create({ deviceId: device.id, type: 'FIRMWARE_UPDATE', payload: { v: '0.1.0' }, timestamp: new Date() });

    // Conformidad de filtro por id INTEGER (el query string "1" debe resolver al device por id)
    const res = await request(app)
      .get(`/api/v1/events?deviceId=${device.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});