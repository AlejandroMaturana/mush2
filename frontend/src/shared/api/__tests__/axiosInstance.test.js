import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import client from '../axiosInstance';
import { getAccessToken, setAccessToken, clearAccessToken } from '../tokenStore';

function axiosError(status, data, config) {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status, data };
  err.config = config || {};
  return err;
}

function installAdapter(handler) {
  client.defaults.adapter = async (config) => {
    const result = handler(config);
    if (result && result.then) return result;
    return result;
  };
}

describe('axiosInstance (ISSUE-029: refresh por cookie httpOnly, sin JWT en localStorage)', () => {
  beforeEach(() => {
    clearAccessToken();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete client.defaults.adapter;
  });

  it('no lee ni escribe el access token en localStorage', () => {
    installAdapter(() => ({ data: {}, status: 200 }));
    client.get('/devices');
    expect(window.localStorage.getItem('mush2_access_token')).toBeNull();
  });

  it('adjunta Authorization Bearer desde memoria', async () => {
    setAccessToken('mem-token');
    let seenAuth = null;
    installAdapter((config) => {
      seenAuth = config.headers?.Authorization || null;
      return { data: {}, status: 200 };
    });
    await client.get('/devices');
    expect(seenAuth).toBe('Bearer mem-token');
  });

  it('en 401 TOKEN_EXPIRED refresca por COOKIE (sin body) y reintenta', async () => {
    setAccessToken('expired');
    let callCount = 0;
    let refreshBody = 'sentinel';
    installAdapter((config) => {
      if (config.url === '/auth/refresh') {
        refreshBody = config.data;
        return { data: { token: { accessToken: 'fresh-token' } }, status: 200 };
      }
      callCount += 1;
      if (callCount === 1) {
        throw axiosError(401, { code: 'TOKEN_EXPIRED' }, config);
      }
      return { data: { ok: true }, status: 200 };
    });

    const res = await client.get('/devices');
    expect(res.status).toBe(200);
    expect(String(refreshBody ?? '')).not.toContain('refreshToken');
    expect(getAccessToken()).toBe('fresh-token');
    expect(callCount).toBe(2);
  });

  it('si el refresh falla, limpia la sesión y redirige a /', async () => {
    setAccessToken('expired');
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      writable: true,
    });
    try {
      installAdapter((config) => {
        if (config.url === '/auth/refresh') {
          throw axiosError(401, { code: 'REFRESH_EXPIRED' }, config);
        }
        throw axiosError(401, { code: 'TOKEN_EXPIRED' }, config);
      });
      await expect(client.get('/devices')).rejects.toBeTruthy();
      expect(assignMock).toHaveBeenCalledWith('/');
      expect(getAccessToken()).toBeNull();
    } finally {
      delete client.defaults.adapter;
    }
  });
});

describe('axiosInstance (ISSUE-033: single-flight de refresh + logout controlado)', () => {
  beforeEach(() => {
    clearAccessToken();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete client.defaults.adapter;
  });

  it('con 3 peticiones concurrentes en 401 TOKEN_EXPIRED, solo dispara 1 llamada a /auth/refresh', async () => {
    setAccessToken('expired');
    let refreshCalls = 0;
    installAdapter((config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1;
        return { data: { token: { accessToken: 'fresh-token' } }, status: 200 };
      }
      if (config.headers?.Authorization === 'Bearer expired') {
        throw axiosError(401, { code: 'TOKEN_EXPIRED' }, config);
      }
      return { data: { ok: true }, status: 200 };
    });

    const results = await Promise.allSettled([
      client.get('/a'),
      client.get('/b'),
      client.get('/c'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('si el refresh falla con concurrentes, redirige SOLO 1 vez (logout controlado)', async () => {
    setAccessToken('expired');
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      writable: true,
    });
    try {
      installAdapter((config) => {
        if (config.url === '/auth/refresh') {
          throw axiosError(401, { code: 'REFRESH_EXPIRED' }, config);
        }
        throw axiosError(401, { code: 'TOKEN_EXPIRED' }, config);
      });

      await Promise.allSettled([client.get('/a'), client.get('/b'), client.get('/c')]);

      expect(assignMock).toHaveBeenCalledTimes(1);
      expect(assignMock).toHaveBeenCalledWith('/');
      expect(getAccessToken()).toBeNull();
      expect(window.localStorage.getItem('mush2_user')).toBeNull();
    } finally {
      delete client.defaults.adapter;
    }
  });
});
