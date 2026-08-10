/**
 * Unit tests — provisioningTokenService (ISSUE-001 / PR-E).
 *
 * Cubre todas las ramas del servicio con el modelo mockeado (sin DB):
 * emisión, consumo atómico (incl. carrera con affected=0), refund, revoke y list.
 */
import { describe, it, expect, jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockFindAll = jest.fn();
const mockGenerate = jest.fn();
const mockHashToken = jest.fn();

jest.unstable_mockModule('../../models/ProvisioningToken.js', () => ({
  default: class MockProvisioningToken {
    static generate = mockGenerate;
    static hashToken = mockHashToken;
    static create = mockCreate;
    static findOne = mockFindOne;
    static findByPk = mockFindByPk;
    static update = mockUpdate;
    static findAll = mockFindAll;
  },
}));

const {
  createProvisioningToken,
  consumeProvisioningToken,
  refundProvisioningToken,
  revokeProvisioningToken,
  listProvisioningTokens,
} = await import('../../services/provisioningTokenService.js');

function sampleToken(overrides = {}) {
  return {
    id: 'tok-1',
    tokenHash: 'abc123',
    label: 'flota-1',
    deviceId: null,
    maxUses: 1,
    usesRemaining: 1,
    expiresAt: null,
    revokedAt: null,
    increment: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerate.mockReturnValue({ raw: 'musht_raw', hash: 'hash-raw' });
  mockHashToken.mockImplementation((raw) => `hash-of-${raw}`);
});

describe('createProvisioningToken', () => {
  it('crea el token con cuota y expiración por defecto (sin ttl ni deviceId)', async () => {
    const token = sampleToken();
    mockCreate.mockResolvedValue(token);
    const result = await createProvisioningToken({ label: 'flota-1' });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: 'hash-raw',
      label: 'flota-1',
      deviceId: null,
      maxUses: 1,
      usesRemaining: 1,
      expiresAt: null,
    }));
    expect(result).toEqual({ id: 'tok-1', raw: 'musht_raw', token });
  });

  it('crea el token con defaults cuando no se pasa ningún argumento', async () => {
    mockCreate.mockResolvedValue(sampleToken({ id: 'defaults' }));
    const result = await createProvisioningToken();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: 'hash-raw',
      label: null,
      deviceId: null,
      maxUses: 1,
      usesRemaining: 1,
      expiresAt: null,
    }));
    expect(result.raw).toBe('musht_raw');
  });

  it('normaliza maxUses inválido/cero a 1 y acepta maxUses numérico', async () => {
    mockCreate.mockResolvedValue(sampleToken({ id: 'a' }));
    await createProvisioningToken({ maxUses: 0 });
    expect(mockCreate.mock.calls[0][0].maxUses).toBe(1);

    mockCreate.mockResolvedValue(sampleToken({ id: 'b' }));
    await createProvisioningToken({ maxUses: '3' });
    expect(mockCreate.mock.calls[1][0].maxUses).toBe(3);
  });

  it('calcula expiresAt cuando ttlDays se provee y vincula deviceId', async () => {
    mockCreate.mockResolvedValue(sampleToken({ id: 'c' }));
    const before = Date.now();
    await createProvisioningToken({ ttlDays: '2', deviceId: 'dev-1' });
    const after = Date.now();
    const created = mockCreate.mock.calls[0][0];
    expect(created.deviceId).toBe('dev-1');
    expect(created.expiresAt.getTime()).toBeGreaterThan(before + 1.9 * 24 * 3600 * 1000);
    expect(created.expiresAt.getTime()).toBeLessThan(after + 2.1 * 24 * 3600 * 1000);
  });
});

describe('consumeProvisioningToken', () => {
  it('rechaza un token raw no válido (no string / vacío)', async () => {
    expect(await consumeProvisioningToken(undefined)).toMatchObject({ ok: false, status: 401, code: 'INVALID_TOKEN' });
    expect(await consumeProvisioningToken(12345)).toMatchObject({ ok: false, status: 401, code: 'INVALID_TOKEN' });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('rechaza token inexistente → INVALID_TOKEN', async () => {
    mockFindOne.mockResolvedValue(null);
    const res = await consumeProvisioningToken('musht_nope');
    expect(mockHashToken).toHaveBeenCalledWith('musht_nope');
    expect(res).toMatchObject({ ok: false, status: 401, code: 'INVALID_TOKEN' });
  });

  it('rechaza token revocado → TOKEN_REVOKED', async () => {
    mockFindOne.mockResolvedValue(sampleToken({ revokedAt: new Date() }));
    const res = await consumeProvisioningToken('musht_x');
    expect(res).toMatchObject({ ok: false, status: 401, code: 'TOKEN_REVOKED' });
  });

  it('rechaza token expirado → TOKEN_EXPIRED', async () => {
    mockFindOne.mockResolvedValue(sampleToken({ expiresAt: new Date(Date.now() - 1000) }));
    const res = await consumeProvisioningToken('musht_x');
    expect(res).toMatchObject({ ok: false, status: 401, code: 'TOKEN_EXPIRED' });
  });

  it('rechaza deviceId distinto al vinculado → 403 TOKEN_DEVICE_MISMATCH', async () => {
    mockFindOne.mockResolvedValue(sampleToken({ deviceId: 'dev-a' }));
    const res = await consumeProvisioningToken('musht_x', { deviceId: 'dev-b' });
    expect(res).toMatchObject({ ok: false, status: 403, code: 'TOKEN_DEVICE_MISMATCH' });
  });

  it('rechaza token agotado → TOKEN_EXHAUSTED', async () => {
    mockFindOne.mockResolvedValue(sampleToken({ usesRemaining: 0 }));
    const res = await consumeProvisioningToken('musht_x');
    expect(res).toMatchObject({ ok: false, status: 401, code: 'TOKEN_EXHAUSTED' });
  });

  it('consume una cuota de forma atómica y devuelve el token', async () => {
    const token = sampleToken({ id: 'tok-ok', usesRemaining: 2, maxUses: 2 });
    mockFindOne.mockResolvedValue(token);
    mockUpdate.mockResolvedValue([1]);

    const res = await consumeProvisioningToken('musht_x', { deviceId: 'dev-a', ip: '1.2.3.4' });

    expect(mockUpdate).toHaveBeenCalledWith(
      { usesRemaining: 1, lastUsedAt: expect.any(Date) },
      { where: { id: 'tok-ok', usesRemaining: 2 } },
    );
    expect(res.ok).toBe(true);
    expect(res.token).toMatchObject({ id: 'tok-ok', label: 'flota-1' });
  });

  it('trata la carrera atómica (update afecta 0 filas) como TOKEN_EXHAUSTED', async () => {
    mockFindOne.mockResolvedValue(sampleToken({ id: 'tok-race' }));
    mockUpdate.mockResolvedValue([0]);
    const res = await consumeProvisioningToken('musht_x');
    expect(res).toMatchObject({ ok: false, status: 401, code: 'TOKEN_EXHAUSTED' });
  });
});

describe('refundProvisioningToken', () => {
  it('no hace nada sin tokenId', async () => {
    expect(await refundProvisioningToken(undefined)).toEqual({ ok: false });
    expect(mockFindByPk).not.toHaveBeenCalled();
  });

  it('no hace nada si el token no existe', async () => {
    mockFindByPk.mockResolvedValue(null);
    expect(await refundProvisioningToken('ghost')).toEqual({ ok: false });
  });

  it('reintegra una cuota solo si queda por debajo de maxUses', async () => {
    const token = sampleToken({ usesRemaining: 0, maxUses: 2 });
    mockFindByPk.mockResolvedValue(token);
    const res = await refundProvisioningToken('tok-1');
    expect(token.increment).toHaveBeenCalledWith('usesRemaining');
    expect(res).toEqual({ ok: true });

    const full = sampleToken({ usesRemaining: 2, maxUses: 2 });
    mockFindByPk.mockResolvedValue(full);
    const resFull = await refundProvisioningToken('tok-1');
    expect(full.increment).not.toHaveBeenCalled();
    expect(resFull).toEqual({ ok: true });
  });
});

describe('revokeProvisioningToken', () => {
  it('devuelve error si el token no existe', async () => {
    mockFindByPk.mockResolvedValue(null);
    expect(await revokeProvisioningToken('ghost')).toEqual({ ok: false, error: 'Token no encontrado' });
  });

  it('revoca el token y persiste revokedAt', async () => {
    const token = sampleToken();
    mockFindByPk.mockResolvedValue(token);
    const res = await revokeProvisioningToken('tok-1');
    expect(token.update).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
    expect(res.ok).toBe(true);
    expect(res.token).toBe(token);
  });
});

describe('listProvisioningTokens', () => {
  it('lista los tokens excluyendo el hash', async () => {
    mockFindAll.mockResolvedValue([sampleToken()]);
    const res = await listProvisioningTokens();
    expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['tokenHash'] },
    }));
    expect(res).toHaveLength(1);
  });
});
