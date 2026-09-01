import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

jest.unstable_mockModule('../../models/RefreshToken.js', () => {
  const store = [];
  const withUpdate = (row) => {
    row.update = jest.fn(async (patch) => { Object.assign(row, patch); });
    return row;
  };
  const model = {
    hashToken: (token) => {
      const crypto = jest.requireActual('crypto');
      return crypto.createHash('sha256').update(token).digest('hex');
    },
    create: jest.fn(async (row) => { const stored = withUpdate(row); store.push(stored); return stored; }),
    findOne: jest.fn(async ({ where }) => store.find(r =>
      r.jti === where.jti && r.userId === where.userId) || null),
    update: jest.fn(async (patch, { where }) => {
      for (const r of store) {
        if (where.userId === r.userId && r.revokedAt === null) Object.assign(r, patch);
      }
    }),
  };
  model.__store = store;
  return { default: model };
});

jest.unstable_mockModule('../../models/User.js', () => {
  const model = {
    findByPk: jest.fn(async (id) => {
      if (id === 'u-1') return { id: 'u-1', username: 'tester', role: 'ADMIN', isActive: true };
      if (id === 'u-inactive') return { id: 'u-inactive', username: 'off', role: 'VIEWER', isActive: false };
      return null;
    }),
  };
  return { default: model };
});

const USER = { id: 'u-1', username: 'tester', role: 'ADMIN' };

let tokenService, RefreshToken, hashToken;

beforeAll(async () => {
  tokenService = await import('../../services/tokenService.js');
  RefreshToken = await import('../../models/RefreshToken.js');
  hashToken = tokenService.hashToken;
});

function mockStore() {
  return RefreshToken.default.__store;
}

describe('ISSUE-017 (BE-017): refresh tokens con hash y revocación por jti', () => {
  beforeEach(() => {
    mockStore().length = 0;
    jest.clearAllMocks();
  });

  it('almacena SOLO el hash sha256 del refresh, nunca el token en claro', async () => {
    const issued = await tokenService.issueRefreshToken(USER);
    expect(issued.token).toBeTruthy();

    const stored = mockStore()[0];
    expect(stored.tokenHash).toBe(hashToken(issued.token));
    expect(stored.tokenHash).not.toBe(issued.token);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored).not.toHaveProperty('token');
  });

  it('el refresh lleva jti (claim) y se persiste para revocación', async () => {
    const issued = await tokenService.issueRefreshToken(USER);
    const decoded = jwt.verify(issued.token, env.JWT_SECRET + '_refresh');
    expect(decoded.jti).toBe(issued.jti);
    expect(mockStore()[0].jti).toBe(issued.jti);
  });

  it('la vida del refresh está acotada (7 días por defecto)', async () => {
    const issued = await tokenService.issueRefreshToken(USER);
    const ageMs = issued.expiresAt.getTime() - Date.now();
    const days = ageMs / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7.1);
  });

  it('tras rotar, el refresh previo queda REVOCADO y su reuso es rechazado', async () => {
    const first = await tokenService.issueRefreshToken(USER);
    const rotated = await tokenService.verifyAndRotate(first.token);
    expect(rotated.ok).toBe(true);
    expect(rotated.token).not.toBe(first.token);

    expect(mockStore().find(r => r.jti === first.jti).revokedAt).toBeTruthy();

    const replay = await tokenService.verifyAndRotate(first.token);
    expect(replay.ok).toBe(false);
    expect(replay.status).toBe(401);
  });

  it('logout revoca DURABLEMENTE todos los refresh del usuario', async () => {
    await tokenService.issueRefreshToken(USER);
    await tokenService.issueRefreshToken(USER);

    await tokenService.revokeAllForUser(USER.id);
    const active = mockStore().filter(r => r.userId === USER.id && r.revokedAt === null);
    expect(active.length).toBe(0);
  });

  it('token de usuario inactivo es rechazado en refresh', async () => {
    const issued = await tokenService.issueRefreshToken({ id: 'u-inactive', username: 'off', role: 'VIEWER' });
    const result = await tokenService.verifyAndRotate(issued.token);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it('token inválido/expirado es rechazado con REFRESH_EXPIRED', async () => {
    const result = await tokenService.verifyAndRotate('not-a-valid-token');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toBe('REFRESH_EXPIRED');
  });

  it('access token firmado con jti y vida de 1h', () => {
    const token = tokenService.signAccessToken(USER);
    const decoded = jwt.verify(token, env.JWT_SECRET);
    expect(decoded.id).toBe(USER.id);
    expect(decoded.jti).toBeTruthy();
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it('signRefreshToken incluye jti y expira en 7d', () => {
    const jti = 'test-jti-1';
    const token = tokenService.signRefreshToken(USER, jti);
    const decoded = jwt.verify(token, env.JWT_SECRET + '_refresh');
    expect(decoded.jti).toBe(jti);
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });

  it('parseRefreshToken lee del body o de la cookie httpOnly', () => {
    expect(tokenService.parseRefreshToken({ body: { refreshToken: 'from-body' } })).toBe('from-body');
    expect(tokenService.parseRefreshToken({
      body: {},
      headers: { cookie: 'refresh_token=from-cookie; other=x' },
    })).toBe('from-cookie');
    expect(tokenService.parseRefreshToken({ body: {}, headers: {} })).toBeNull();
  });
});
