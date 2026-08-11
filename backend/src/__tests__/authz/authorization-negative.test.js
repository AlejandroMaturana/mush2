import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import sequelize from '../../config/database.js';
import { env } from '../../config/env.js';
import { markReady } from '../../config/readiness.js';
import { tenantScope } from '../../middlewares/tenant.js';
import { createProvisioningToken, revokeProvisioningToken } from '../../services/provisioningTokenService.js';
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

describe('ISSUE-003/I106: /monitoring/* requiere auth + rol ADMIN (PR-F)', () => {
  const monitoringDenyCases = [
    { method: 'get', path: '/api/v1/monitoring/metrics' },
    { method: 'get', path: '/api/v1/monitoring/health/db' },
    { method: 'get', path: '/api/v1/monitoring/logs' },
    { method: 'get', path: '/api/v1/monitoring/stream' },
  ];

  for (const c of monitoringDenyCases) {
    it(`${c.method.toUpperCase()} ${c.path} anónimo → 401/403`, async () => {
      const res = await request(app)[c.method](c.path);
      expect([401, 403]).toContain(res.status);
    });
  }

  it('GET /health sigue siendo público → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

const HAS_TEST_DB = /mush2_test/.test(process.env.DATABASE_URL || '');
const itDb = HAS_TEST_DB ? it : it.skip;

describe('ISSUE-001: POST /devices/register exige sesión o token de aprovisionamiento', () => {  it('anónimo sin token → 401 (AUTH_REQUIRED), sin acuñar credenciales', async () => {
    const res = await request(app)
      .post('/api/v1/devices/register')
      .send({ deviceId: 'anon-no-token', macAddress: 'AA:00:00:00:00:01' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  itDb('anónimo con token inexistente → 401 (INVALID_TOKEN)', async () => {
    const res = await request(app)
      .post('/api/v1/devices/register')
      .set('X-Provision-Token', 'musht_does-not-exist')
      .send({ deviceId: 'anon-bad-token', macAddress: 'AA:00:00:00:00:02' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });
});

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

  describe('ISSUE-001: token de aprovisionamiento de un solo uso (integración)', () => {
    let deviceCounter = 0;
    const nextDevice = () => `reg-token-${Date.now()}-${deviceCounter++}`;

    itDb('token válido de un solo uso → 201 y devuelve credenciales MQTT (ADR-028)', async () => {
      const deviceId = nextDevice();
      const { raw } = await createProvisioningToken({ label: 'issu-001-ok', maxUses: 1 });
      const res = await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId, macAddress: 'AA:BB:CC:DD:EE:F0', firmwareVersion: '0.24.0' });
      expect([200, 201]).toContain(res.status);
      if (res.body.mqtt) {
        expect(res.body.mqtt.user).toBe(`dev_${deviceId}`);
      }
      const device = await Device.findOne({ where: { deviceId } });
      expect(device).not.toBeNull();
    });

    itDb('el mismo token NO puede registrar un segundo dispositivo (TOKEN_EXHAUSTED)', async () => {
      const { raw } = await createProvisioningToken({ label: 'issu-001-reuse', maxUses: 1 });
      const first = nextDevice();
      const second = nextDevice();
      await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId: first });
      const res = await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId: second });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXHAUSTED');
      const device = await Device.findOne({ where: { deviceId: second } });
      expect(device).toBeNull();
    });

    itDb('token con cuota > 1 permite N registros y luego rechaza', async () => {
      const { raw } = await createProvisioningToken({ label: 'issu-001-quota', maxUses: 2 });
      const a = nextDevice();
      const b = nextDevice();
      const c = nextDevice();
      const r1 = await request(app)
        .post('/api/v1/devices/register').set('X-Provision-Token', raw).send({ deviceId: a });
      const r2 = await request(app)
        .post('/api/v1/devices/register').set('X-Provision-Token', raw).send({ deviceId: b });
      const r3 = await request(app)
        .post('/api/v1/devices/register').set('X-Provision-Token', raw).send({ deviceId: c });
      expect([200, 201]).toContain(r1.status);
      expect([200, 201]).toContain(r2.status);
      expect(r3.status).toBe(401);
      expect(r3.body.code).toBe('TOKEN_EXHAUSTED');
    });

    itDb('token vinculado a un deviceId NO sirve para otro dispositivo (TOKEN_DEVICE_MISMATCH)', async () => {
      const boundDevice = nextDevice();
      const otherDevice = nextDevice();
      const { raw } = await createProvisioningToken({
        label: 'issu-001-bound',
        maxUses: 1,
        deviceId: boundDevice,
      });
      const res = await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId: otherDevice });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TOKEN_DEVICE_MISMATCH');
      const legit = await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId: boundDevice });
      expect([200, 201]).toContain(legit.status);
    });

    itDb('token revocado → 401 (TOKEN_REVOKED)', async () => {
      const { id, raw } = await createProvisioningToken({ label: 'issu-001-revoked', maxUses: 1 });
      await revokeProvisioningToken(id);
      const res = await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId: nextDevice() });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_REVOKED');
    });

    itDb('token expirado → 401 (TOKEN_EXPIRED)', async () => {
      const { raw } = await createProvisioningToken({
        label: 'issu-001-expired',
        maxUses: 1,
        ttlDays: -1,
      });
      const res = await request(app)
        .post('/api/v1/devices/register')
        .set('X-Provision-Token', raw)
        .send({ deviceId: nextDevice() });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    itDb('registro con sesión válida (sin token) sigue funcionando', async () => {
      const deviceId = nextDevice();
      const res = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deviceId });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('ISSUE-003: /monitoring/* positivo (ADMIN 200, OPERATOR 403)', () => {
    itDb('ADMIN accede a /monitoring/metrics → 200', async () => {
      const res = await request(app)
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
    });

    itDb('ADMIN accede a /monitoring/health/db → 200', async () => {
      const res = await request(app)
        .get('/api/v1/monitoring/health/db')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
    });

    itDb('OPERATOR NO accede a /monitoring/metrics → 403', async () => {
      const res = await request(app)
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    itDb('OPERATOR NO accede a /monitoring/logs → 403', async () => {
      const res = await request(app)
        .get('/api/v1/monitoring/logs')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });
  });
});
