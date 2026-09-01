import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';

const mockFindOne = jest.fn();
const mockKeyUpdate = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  ApiKey: {
    hashKey: (key) => `hash-${key}`,
    findOne: mockFindOne,
  },
  User: {},
}));

jest.unstable_mockModule('../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret' },
}));

const { authenticate } = await import('../middlewares/auth.js');

function makeKey(id) {
  return {
    id,
    keyHash: `hash-key-${id}`,
    isActive: true,
    expiresAt: null,
    ipWhitelist: null,
    rateLimit: 100,
    update: mockKeyUpdate,
    User: { id: `u-${id}`, username: 'tester', role: 'ADMIN', isActive: true },
  };
}

function makeReq() {
  return {
    headers: { 'x-api-key': 'key-1' },
    ip: '127.0.0.1',
    connection: {},
  };
}

function makeRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('API key lastUsed throttle (ISSUE-018)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-08-15T12:00:00Z') });
    mockFindOne.mockReset();
    mockKeyUpdate.mockReset();
    mockKeyUpdate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flushes lastUsed on the first request for a key', async () => {
    mockFindOne.mockResolvedValue(makeKey(1));
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(mockKeyUpdate).toHaveBeenCalledTimes(1);
    expect(mockKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({
      lastUsedAt: expect.any(Date),
      lastIpAddress: '127.0.0.1',
      authFailures: 0,
    }));
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(expect.objectContaining({ authMethod: 'api_key', apiKeyId: 1 }));
  });

  it('does NOT update lastUsed on an immediate second request', async () => {
    mockFindOne.mockResolvedValue(makeKey(2));

    await authenticate(makeReq(), makeRes(), jest.fn());
    expect(mockKeyUpdate).toHaveBeenCalledTimes(1);

    mockKeyUpdate.mockClear();
    await authenticate(makeReq(), makeRes(), jest.fn());

    expect(mockKeyUpdate).not.toHaveBeenCalled();
    expect(mockFindOne).toHaveBeenCalledTimes(2);
  });

  it('flushes again after the throttle window elapses', async () => {
    mockFindOne.mockResolvedValue(makeKey(3));

    await authenticate(makeReq(), makeRes(), jest.fn());
    expect(mockKeyUpdate).toHaveBeenCalledTimes(1);

    mockKeyUpdate.mockClear();
    jest.advanceTimersByTime(60_000);
    await authenticate(makeReq(), makeRes(), jest.fn());

    expect(mockKeyUpdate).toHaveBeenCalledTimes(1);
    expect(mockKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({ authFailures: 0 }));
  });
});
