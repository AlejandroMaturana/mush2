import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import sequelize from '../../config/database.js';
import { env } from '../../config/env.js';
import { markReady } from '../../config/readiness.js';
import { tenantScope } from '../../middlewares/tenant.js';
import {
  User, Device, CultivationCycle, Alarm, SpeciesProfile, Event, Recipe,
} from '../../models/index.js';

jest.setTimeout(30000);

beforeAll(() => markReady());

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('tenantScope: denegación por defecto (ISSUE-002)', () => {
  it('anónimo en ruta no pública → 401 y NO llama a next()', async () => {
    const req = { method: 'GET', originalUrl: '/api/v1/devices', user: null };
    const res = mockRes();
    let nextCalled = false;
    await tenantScope(req, res, () => { nextCalled = true; });
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('anónimo en POST /devices/register (whitelist firmware) → next()', async () => {
    const req = { method: 'POST', originalUrl: '/api/v1/devices/register', user: null };
    const res = mockRes();
    let nextCalled = false;
    await tenantScope(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('anónimo en GET /actuators (whitelist firmware) → next()', async () => {
    const req = { method: 'GET', originalUrl: '/api/v1/actuators?deviceId=dev-1', user: null };
    const res = mockRes();
    let nextCalled = false;
    await tenantScope(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('usuario autenticado → setea req.tenant', async () => {
    const req = { method: 'GET', originalUrl: '/api/v1/devices', user: { id: 'u-1' } };
    const res = mockRes();
    let nextCalled = false;
    await tenantScope(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.tenant).toEqual({ userId: 'u-1', filter: { userId: 'u-1' } });
  });
});

describe('ISSUE-002/I106: anónimo NO puede leer/mutar datos de tenant', () => {
  const denyCases = [
    { method: 'get', path: '/api/v1/devices' },
    { method: 'get', path: '/api/v1/cycles' },
    { method: 'get', path: '/api/v1/recipes' },
    { method: 'get', path: '/api/v1/events' },
    { method: 'get', path: '/api/v1/chambers/1/analytics' },
    { method: 'get', path: '/api/v1/species' },
    { method: 'get', path: '/api/v1/alarms' },
    { method: 'patch', path: '/api/v1/actuators/1', body: { deviceId: 'x', command: 'ON' } },
    { method: 'put', path: '/api/v1/species/1', body: { name: 'x' } },
    { method: 'delete', path: '/api/v1/species/1' },
  ];

  for (const c of denyCases) {
    it(`${c.method.toUpperCase()} ${c.path} anónimo → 401/403`, async () => {
      const req = request(app)[c.method](c.path);
      if (c.body) req.send(c.body);
      const res = await req;
      expect([401, 403]).toContain(res.status);
    });
  }
});

describe('ISSUE-002: whitelist pública preserva flujos del firmware', () => {
  const publicCases = [
    { method: 'post', path: '/api/v1/devices/register', body: { deviceId: 'whitelist-test' } },
    { method: 'get', path: '/api/v1/actuators?deviceId=whitelist-test' },
  ];

  for (const c of publicCases) {
    it(`${c.method.toUpperCase()} ${c.path} anónimo NO debe ser 401/403`, async () => {
      const req = request(app)[c.method](c.path);
      if (c.body) req.send(c.body);
      const res = await req;
      expect([401, 403]).not.toContain(res.status);
    });
  }
});

const HAS_TEST_DB = /mush2_test/.test(process.env.DATABASE_URL || '');
const itDb = HAS_TEST_DB ? it : it.skip;

describe('ISSUE-004/I005/I106: propiedad y roles (requiere DATABASE_URL mush2_test)', () => {
  let userA, userB, deviceA, recipeA, cycleA, alarmA, speciesA, tokenA, tokenB;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    userA = await User.create({
      username: 'owner-a', email: 'a@test.local',
      passwordHash: bcrypt.hashSync('pass', 8), role: 'ADMIN',
    });
    userB = await User.create({
      username: 'other-b', email: 'b@test.local',
      passwordHash: bcrypt.hashSync('pass', 8), role: 'OPERATOR',
    });
    deviceA = await Device.create({ deviceId: 'dev-a-test', macAddress: 'AA:BB:CC:DD:EE:01', userId: userA.id });
    recipeA = await Recipe.create({ name: 'Recipe A', species: 'Reishi' });
    cycleA = await CultivationCycle.create({
      userId: userA.id, deviceId: deviceA.id, recipeId: recipeA.id,
      species: 'Reishi', status: 'PLANNED', currentPhase: 'INCUBATION',
    });
    alarmA = await Alarm.create({ deviceId: deviceA.id, type: 'SENSOR_FAULT', severity: 'HIGH', message: 'alarma de A' });
    speciesA = await SpeciesProfile.create({ name: 'Specie A', scientificName: 'Specia a', adapterClass: 'WOOD' });
    await Event.create({ deviceId: deviceA.id, type: 'SYSTEM_BOOT', timestamp: new Date() });

    const sign = (u) => jwt.sign({ id: u.id, username: u.username, role: u.role }, env.JWT_SECRET);
    tokenA = sign(userA);
    tokenB = sign(userB);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  itDb('B no puede leer el ciclo de A (GET /cycles/:id → 403)', async () => {
    const res = await request(app).get(`/api/v1/cycles/${cycleA.id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  itDb('B no puede mutar el ciclo de A (PATCH /cycles/:id → 403)', async () => {
    const res = await request(app).patch(`/api/v1/cycles/${cycleA.id}`).set('Authorization', `Bearer ${tokenB}`).send({ notes: 'hack' });
    expect(res.status).toBe(403);
  });

  itDb('B no puede transicionar el ciclo de A (POST transition → 403)', async () => {
    const res = await request(app).post(`/api/v1/cycles/${cycleA.id}/transition`).set('Authorization', `Bearer ${tokenB}`).send({ toPhase: 'FRUITING' });
    expect(res.status).toBe(403);
  });

  itDb('B no puede abortar el ciclo de A (POST abort → 403)', async () => {
    const res = await request(app).post(`/api/v1/cycles/${cycleA.id}/abort`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  itDb('B no puede añadir bioactivos al ciclo de A (POST bioactives → 403)', async () => {
    const res = await request(app).post(`/api/v1/cycles/${cycleA.id}/bioactives`).set('Authorization', `Bearer ${tokenB}`).send({ compoundName: 'x', concentration: 1 });
    expect(res.status).toBe(403);
  });

  itDb('B no puede leer los sub-recursos del ciclo de A (transitions/states → 403)', async () => {
    const transitions = await request(app).get(`/api/v1/cycles/${cycleA.id}/transitions`).set('Authorization', `Bearer ${tokenB}`);
    expect(transitions.status).toBe(403);
    const states = await request(app).get(`/api/v1/cycles/${cycleA.id}/states`).set('Authorization', `Bearer ${tokenB}`);
    expect(states.status).toBe(403);
  });

  itDb('B no puede acknowledge la alarma de A (→ 403)', async () => {
    const res = await request(app).patch(`/api/v1/alarms/${alarmA.id}/acknowledge`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  itDb('B no puede resolver la alarma de A (→ 403)', async () => {
    const res = await request(app).patch(`/api/v1/alarms/${alarmA.id}/resolve`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  itDb('B (OPERATOR) no puede editar el catálogo de especies (PUT → 403)', async () => {
    const res = await request(app).put(`/api/v1/species/${speciesA.id}`).set('Authorization', `Bearer ${tokenB}`).send({ name: 'hack' });
    expect(res.status).toBe(403);
  });

  itDb('B (OPERATOR) no puede borrar especies (DELETE → 403)', async () => {
    const res = await request(app).delete(`/api/v1/species/${speciesA.id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  itDb('B no puede comandar el actuador del dispositivo de A (PATCH /actuators/:channel → 403)', async () => {
    const res = await request(app).patch('/api/v1/actuators/1').set('Authorization', `Bearer ${tokenB}`).send({ deviceId: 'dev-a-test', command: 'ON' });
    expect(res.status).toBe(403);
  });

  itDb('A sí puede comandar su actuador (→ 200)', async () => {
    const res = await request(app).patch('/api/v1/actuators/1').set('Authorization', `Bearer ${tokenA}`).send({ deviceId: 'dev-a-test', command: 'ON' });
    expect(res.status).toBe(200);
  });

  itDb('PATCH /actuators anónimo a dispositivo inexistente NO auto-crea el device (401 y no persiste)', async () => {
    const before = await Device.findOne({ where: { deviceId: 'ghost-dev' } });
    expect(before).toBeNull();
    const res = await request(app).patch('/api/v1/actuators/1').send({ deviceId: 'ghost-dev', command: 'ON' });
    expect([401, 403]).toContain(res.status);
    const after = await Device.findOne({ where: { deviceId: 'ghost-dev' } });
    expect(after).toBeNull();
  });

  itDb('B no puede ver analytics del dispositivo de A (→ 403)', async () => {
    const res = await request(app).get(`/api/v1/chambers/${deviceA.id}/analytics`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  itDb('A puede ver analytics de su dispositivo (→ 200)', async () => {
    const res = await request(app).get(`/api/v1/chambers/${deviceA.id}/analytics`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });

  itDb('B GET /events no expone eventos del dispositivo de A', async () => {
    const res = await request(app).get('/api/v1/events').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map(e => e.deviceId);
    expect(ids).not.toContain(deviceA.id);
  });

  itDb('A GET /events incluye eventos de su dispositivo', async () => {
    const res = await request(app).get('/api/v1/events').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map(e => e.deviceId);
    expect(ids).toContain(deviceA.id);
  });

  itDb('B GET /cycles no incluye el ciclo de A (aislamiento de tenant)', async () => {
    const res = await request(app).get('/api/v1/cycles').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map(c => c.id);
    expect(ids).not.toContain(cycleA.id);
  });

  itDb('A GET /cycles incluye su ciclo', async () => {
    const res = await request(app).get('/api/v1/cycles').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map(c => c.id);
    expect(ids).toContain(cycleA.id);
  });
});
