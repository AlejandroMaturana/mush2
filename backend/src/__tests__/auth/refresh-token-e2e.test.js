import { describe, it, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import sequelize from '../../config/database.js';
import { markReady } from '../../config/readiness.js';
import { User, RefreshToken } from '../../models/index.js';

jest.setTimeout(30000);

beforeAll(() => markReady());

const HAS_TEST_DB = /mush2_test/.test(process.env.DATABASE_URL || '');
const itDb = HAS_TEST_DB ? it : it.skip;

describe('ISSUE-017: flujo de refresh tokens E2E (requiere DATABASE_URL mush2_test)', () => {
  let user;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    user = await User.create({
      username: 'refresh-e2e',
      email: 'refresh-e2e@test.local',
      passwordHash: bcrypt.hashSync('Pass1234!', 8),
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  itDb('login emite cookie httpOnly con refresh y NO persiste el token en claro', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'refresh-e2e', password: 'Pass1234!' });

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    const cookie = res.headers['set-cookie'].find(c => c.startsWith('refresh_token='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');

    const rows = await RefreshToken.findAll({ where: { userId: user.id } });
    expect(rows.length).toBeGreaterThan(0);
    const tokenHash = rows[0].tokenHash;
    expect(tokenHash).not.toBe(res.body.token.refreshToken);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  itDb('refresh rota el token y el refresh previo queda revocado', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'refresh-e2e', password: 'Pass1234!' });
    const firstRefresh = login.body.token.refreshToken;

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(refresh.status).toBe(200);
    const rotated = refresh.body.token.refreshToken;
    expect(rotated).not.toBe(firstRefresh);

    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(replay.status).toBe(401);
  });

  itDb('refresh también acepta el token desde la cookie httpOnly', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'refresh-e2e', password: 'Pass1234!' });
    const cookie = login.headers['set-cookie'].find(c => c.startsWith('refresh_token='));
    const cookieValue = cookie.split(';')[0];

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieValue);
    expect(refresh.status).toBe(200);
    expect(refresh.body.token.accessToken).toBeTruthy();
  });

  itDb('logout revoca DURABLEMENTE todos los refresh del usuario', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'refresh-e2e', password: 'Pass1234!' });
    const accessToken = login.body.token.accessToken;

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logout.status).toBe(200);

    const active = await RefreshToken.findAll({
      where: { userId: user.id, revokedAt: null },
    });
    expect(active.length).toBe(0);

    const refreshAfterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.token.refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });

  itDb('refresh con token inexistente → 401 REFRESH_EXPIRED', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'token-que-no-existe' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('REFRESH_EXPIRED');
  });

  itDb('refresh sin token → 400', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(400);
  });
});
