/**
 * Unit tests — provisioningAuth middleware (ISSUE-001 / PR-E).
 *
 * Cubre todas las ramas del gate con el servicio de tokens mockeado (sin DB).
 */
import { describe, it, expect, jest } from '@jest/globals';

const mockConsume = jest.fn();

jest.unstable_mockModule('../../services/provisioningTokenService.js', () => ({
  consumeProvisioningToken: mockConsume,
}));

const { requireProvisioningAuth } = await import('../../middlewares/provisioningAuth.js');

function mockRes() {
  const res = { statusCode: 200, body: null };
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(body) {
      res.body = body;
      return this;
    },
    _value: res,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requireProvisioningAuth', () => {
  it('pasa si ya hay sesión autenticada (req.user)', async () => {
    const next = jest.fn();
    const res = mockRes();
    await requireProvisioningAuth({ user: { id: 'u1' }, headers: {} }, res, next);
    expect(next).toHaveBeenCalled();
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it('rechaza sin sesión ni header → 401 AUTH_REQUIRED', async () => {
    const next = jest.fn();
    const res = mockRes();
    await requireProvisioningAuth({ headers: {} }, res, next);
    expect(res._value.statusCode).toBe(401);
    expect(res._value.body.code).toBe('AUTH_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza header vacío o no string → 401 AUTH_REQUIRED', async () => {
    for (const header of ['', '   ', 12345]) {
      const next = jest.fn();
      const res = mockRes();
      await requireProvisioningAuth({ headers: { 'x-provision-token': header } }, res, next);
      expect(res._value.statusCode).toBe(401);
      expect(res._value.body.code).toBe('AUTH_REQUIRED');
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('envía deviceId al consumidor aun cuando req.body es undefined (rama req.body)', async () => {
    mockConsume.mockResolvedValue({ ok: true, token: { id: 'tok-1' } });
    const next = jest.fn();
    const res = mockRes();
    const req = { headers: { 'x-provision-token': '  musht_x  ' }, body: undefined };
    await requireProvisioningAuth(req, res, next);
    expect(mockConsume).toHaveBeenCalledWith('musht_x', { deviceId: undefined, ip: undefined });
    expect(req.provisionToken).toEqual({ id: 'tok-1' });
    expect(next).toHaveBeenCalled();
  });

  it('envía deviceId del body y propaga el token en req.provisionToken', async () => {
    mockConsume.mockResolvedValue({ ok: true, token: { id: 'tok-2' } });
    const next = jest.fn();
    const res = mockRes();
    const req = { headers: { 'x-provision-token': 'musht_x' }, body: { deviceId: 'dev-a' } };
    await requireProvisioningAuth(req, res, next);
    expect(mockConsume).toHaveBeenCalledWith('musht_x', { deviceId: 'dev-a', ip: undefined });
    expect(next).toHaveBeenCalled();
  });

  it('responde con el status del consumidor cuando falla (401/403)', async () => {
    mockConsume.mockResolvedValue({ ok: false, status: 403, code: 'TOKEN_DEVICE_MISMATCH', error: 'x' });
    const next = jest.fn();
    const res = mockRes();
    await requireProvisioningAuth({ headers: { 'x-provision-token': 'musht_x' }, body: {} }, res, next);
    expect(res._value.statusCode).toBe(403);
    expect(res._value.body.code).toBe('TOKEN_DEVICE_MISMATCH');
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 por defecto cuando el consumidor no devuelve status', async () => {
    mockConsume.mockResolvedValue({ ok: false, code: 'INVALID_TOKEN', error: 'x' });
    const next = jest.fn();
    const res = mockRes();
    await requireProvisioningAuth({ headers: { 'x-provision-token': 'musht_x' }, body: {} }, res, next);
    expect(res._value.statusCode).toBe(401);
    expect(res._value.body.code).toBe('INVALID_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });
});
