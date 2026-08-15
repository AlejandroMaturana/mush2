import { jest } from '@jest/globals';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';

const mockDeviceFindOne = jest.fn();
const mockActuatorFindAll = jest.fn();
const mockSubscriptionFindOne = jest.fn();
const mockGetAccessibleDeviceIds = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Device: { findOne: mockDeviceFindOne },
  Actuator: { findAll: mockActuatorFindAll },
  Subscription: { findOne: mockSubscriptionFindOne },
}));

jest.unstable_mockModule('../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret' },
}));

jest.unstable_mockModule('../middlewares/tenant.js', () => ({
  getAccessibleDeviceIds: mockGetAccessibleDeviceIds,
}));

const { startWebSocketServer, stopWebSocketServer } = await import('../services/webSocketServer.js');

const JWT_SECRET = 'test-secret';

function signToken() {
  return jwt.sign({ id: 'user-1', username: 'tester', role: 'ADMIN' }, JWT_SECRET);
}

function connectAndWaitClose(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    const timer = setTimeout(() => {
      client.terminate();
      reject(new Error(`Timeout esperando cierre: ${url}`));
    }, timeoutMs);
    client.on('close', (code, reason) => {
      clearTimeout(timer);
      client.terminate();
      resolve({ code, reason: reason.toString() });
    });
    client.on('error', (err) => {
      clearTimeout(timer);
      client.terminate();
      reject(err);
    });
  });
}

function connectAndWaitState(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    const timer = setTimeout(() => {
      client.terminate();
      reject(new Error('Timeout esperando actuator_state'));
    }, timeoutMs);
    client.on('message', (raw) => {
      clearTimeout(timer);
      client.terminate();
      resolve(JSON.parse(raw.toString()));
    });
    client.on('close', () => {
      clearTimeout(timer);
      reject(new Error('Cerrado antes de recibir frame'));
    });
    client.on('error', (err) => {
      clearTimeout(timer);
      client.terminate();
      reject(err);
    });
  });
}

describe('webSocketServer — WebSocket Auth (RFC-0006, ISSUE-013)', () => {
  let httpServer;
  let wsUrl;

  beforeAll(async () => {
    jest.setTimeout(15000);
    httpServer = createServer();
    await new Promise((resolve) => httpServer.listen(0, resolve));
    wsUrl = `ws://localhost:${httpServer.address().port}/ws`;
    startWebSocketServer(httpServer);
  });

  afterAll(async () => {
    stopWebSocketServer();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessibleDeviceIds.mockResolvedValue(['wd-001']);
    mockSubscriptionFindOne.mockResolvedValue({ plan: 'BASIC', status: 'ACTIVE' });
    mockDeviceFindOne.mockResolvedValue({ id: 1, deviceId: 'wd-001' });
    mockActuatorFindAll.mockResolvedValue([{ channel: 1, state: 'ON', mode: 'REMOTE' }]);
  });

  it('sin token cierra con 4401', async () => {
    const { code } = await connectAndWaitClose(`${wsUrl}?deviceId=wd-001`);
    expect(code).toBe(4401);
  });

  it('token inválido cierra con 4401', async () => {
    const { code } = await connectAndWaitClose(`${wsUrl}?deviceId=wd-001&token=not-a-valid-jwt`);
    expect(code).toBe(4401);
  });

  it('token válido + plan FREE cierra con 4403 (QoS insufficient)', async () => {
    mockSubscriptionFindOne.mockResolvedValue({ plan: 'FREE', status: 'ACTIVE' });
    const token = signToken();
    const { code } = await connectAndWaitClose(`${wsUrl}?deviceId=wd-001&token=${token}`);
    expect(code).toBe(4403);
  });

  it('token válido + plan BASIC + device accesible conecta y recibe actuator_state', async () => {
    const token = signToken();
    const frame = await connectAndWaitState(`${wsUrl}?deviceId=wd-001&token=${token}`);
    expect(frame.type).toBe('actuator_state');
    expect(frame.deviceId).toBe('wd-001');
    expect(frame.actuators).toEqual([{ channel: 1, state: 'ON', mode: 'REMOTE' }]);
  });

  it('token válido + plan PREMIUM + device NO accesible cierra con 4403', async () => {
    mockSubscriptionFindOne.mockResolvedValue({ plan: 'PREMIUM', status: 'ACTIVE' });
    mockGetAccessibleDeviceIds.mockResolvedValue(['wd-other']);
    const token = signToken();
    const { code } = await connectAndWaitClose(`${wsUrl}?deviceId=wd-001&token=${token}`);
    expect(code).toBe(4403);
  });
});
