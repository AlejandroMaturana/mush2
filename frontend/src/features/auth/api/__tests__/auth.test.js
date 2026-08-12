import { describe, it, expect, beforeEach, vi } from 'vitest';
import client from '../../../../shared/api/axiosInstance';
import { login, register } from '../auth';
import { clearAccessToken } from '../../../../shared/api/tokenStore';

function captureRequest(payload) {
  client.defaults.adapter = async (config) => {
    payload.push(config);
    return { data: {}, status: 200 };
  };
}

describe('auth API (ISSUE-031: registro alineado a api-contract v1 — {username,email,password}, sin role del cliente)', () => {
  beforeEach(() => {
    clearAccessToken();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete client.defaults.adapter;
  });

  it('register envía {username, email, password} en ese orden, sin role', async () => {
    const requests = [];
    captureRequest(requests);

    await register('nuevo-user', 'user@ejemplo.com', 'Pass1234!');

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/auth/register');
    const body = requests[0].data;
    expect(String(body ?? '')).toContain('"username":"nuevo-user"');
    expect(String(body ?? '')).toContain('"email":"user@ejemplo.com"');
    expect(String(body ?? '')).toContain('"password":"Pass1234!"');
    expect(String(body ?? '')).not.toContain('role');
  });

  it('login envía {username, password} y no incluye email', async () => {
    const requests = [];
    captureRequest(requests);

    await login('operador', 'Pass1234!');

    const body = String(requests[0].data ?? '');
    expect(body).toContain('"username":"operador"');
    expect(body).toContain('"password":"Pass1234!"');
    expect(body).not.toContain('"email"');
    expect(body).not.toContain('role');
  });
});