import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../services/logReaderService.js', () => ({
  readLogs: () => Promise.reject(new Error('boom-log-reader')),
}));

vi.mock('../../models/index.js', () => {
  const reject = () => Promise.reject(new Error('boom-model'));
  return {
    Device: { count: reject, findAll: reject },
    DeviceHealth: { findOne: reject, findLatest: reject },
    Telemetry: { count: reject },
    Event: { count: reject },
    User: { count: reject, findAll: reject, findByPk: reject },
    CultivationCycle: { count: reject },
    AuditLog: { count: reject, findAndCountAll: reject },
  };
});

vi.mock('../../middlewares/auth.js', () => ({
  authenticate: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

vi.mock('../../config/database.js', () => ({
  default: { authenticate: () => Promise.reject(new Error('boom-db')) },
  authenticate: () => Promise.reject(new Error('boom-db')),
}));

vi.mock('../../services/auditService.js', () => ({
  logAudit: () => Promise.resolve(),
}));

let monitoringRouter;
let adminRouter;

beforeAll(async () => {
  monitoringRouter = (await import('../../routes/monitoring.js')).default;
  adminRouter = (await import('../../routes/admin.js')).default;
});

function makeApp(router: express.Router) {
  const app = express();
  app.use((req, res, next) => {
    req.user = { id: 'u-admin', role: 'SUPER_ADMIN' };
    next();
  });
  app.use(router);
  return app;
}

function assertGenericServerError(res: request.Response) {
  expect(res.status).toBe(500);
  expect(res.body.error).toBe('SERVER_ERROR');
  expect(res.body.message).toBe('Error interno del servidor');
  expect(JSON.stringify(res.body)).not.toMatch(/boom|err\.message/);
}

describe('ISSUE-003: errores de /monitoring/* y /admin/* son genéricos (sin err.message al cliente)', () => {
  describe('monitoring.js', () => {
    let app: express.Application;
    beforeAll(() => { app = makeApp(monitoringRouter); });

    it('GET /metrics ante fallo de DB → 500 genérico', async () => {
      const res = await request(app).get('/metrics');
      assertGenericServerError(res);
    });

    it('GET /logs ante fallo del reader → 500 genérico', async () => {
      const res = await request(app).get('/logs');
      assertGenericServerError(res);
    });

    it('GET /health/db ante fallo de autenticación DB → 503 (comportamiento existente preservado)', async () => {
      const res = await request(app).get('/health/db');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'error', db: 'disconnected' });
    });
  });

  describe('admin.js', () => {
    let app: express.Application;
    beforeAll(() => { app = makeApp(adminRouter); });

    it('GET /users ante fallo de DB → 500 genérico', async () => {
      const res = await request(app).get('/users');
      assertGenericServerError(res);
    });

    it('GET /users/:id ante fallo de DB → 500 genérico', async () => {
      const res = await request(app).get('/users/1');
      assertGenericServerError(res);
    });

    it('PATCH /users/:id/role ante fallo de DB → 500 genérico', async () => {
      const res = await request(app).patch('/users/1/role').send({ role: 'ADMIN' });
      assertGenericServerError(res);
    });

    it('PATCH /users/:id/toggle-active ante fallo de DB → 500 genérico', async () => {
      const res = await request(app).patch('/users/1/toggle-active');
      assertGenericServerError(res);
    });

    it('GET /audit-logs ante fallo de DB → 500 genérico', async () => {
      const res = await request(app).get('/audit-logs');
      assertGenericServerError(res);
    });
  });
});
