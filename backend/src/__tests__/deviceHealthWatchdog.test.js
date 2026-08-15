import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockHealthFindOne = jest.fn();
const mockEmit = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Device: { findAll: mockFindAll, findByPk: mockFindByPk },
  DeviceHealth: { findOne: mockHealthFindOne },
}));

jest.unstable_mockModule('../services/eventBus.js', () => ({
  events: { emit: mockEmit },
}));

const { evaluateAllDevices, evaluateDevice } = await import('../services/deviceHealthService.js');

function makeDevice(overrides = {}) {
  return {
    id: 1,
    deviceId: 'wd-001',
    lifecycle: 'ACTIVE',
    lastSeen: new Date(Date.now() - 5000),
    heartbeatInterval: 10,
    staleMultiplier: 3,
    offlineMultiplier: 6,
    maintenanceMode: false,
    ...overrides,
  };
}

describe('Watchdog offline detection (ISSUE-007)', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
    mockFindByPk.mockReset();
    mockHealthFindOne.mockReset();
    mockHealthFindOne.mockResolvedValue(null);
    mockEmit.mockReset();
    jest.useFakeTimers({ now: new Date('2026-08-14T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('baseline: first evaluation does NOT emit (no false offline)', async () => {
    mockFindAll.mockResolvedValue([makeDevice()]);
    const transitions = await evaluateAllDevices();
    expect(transitions).toEqual([]);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits DeviceOffline + device_status_changed when a device goes offline', async () => {
    mockFindAll.mockResolvedValue([makeDevice()]);
    await evaluateAllDevices();

    mockEmit.mockClear();
    mockFindAll.mockResolvedValue([makeDevice({ lastSeen: new Date(Date.now() - 70000) })]);

    const transitions = await evaluateAllDevices();
    expect(transitions).toHaveLength(1);
    expect(transitions[0].to.connectivity).toBe('OFFLINE');

    const healthEvents = mockEmit.mock.calls.filter(([event]) => event === 'device_health');
    expect(healthEvents.some(([, payload]) => payload.event === 'DeviceOffline')).toBe(true);
    expect(mockEmit).toHaveBeenCalledWith(
      'device_status_changed',
      expect.objectContaining({
        deviceId: 'wd-001',
        status: expect.objectContaining({ connectivity: 'OFFLINE' }),
      }),
    );
  });

  it('does not re-emit while the device stays offline', async () => {
    mockFindAll.mockResolvedValue([makeDevice()]);
    await evaluateAllDevices();

    mockEmit.mockClear();
    mockFindAll.mockResolvedValue([makeDevice({ lastSeen: new Date(Date.now() - 70000) })]);
    await evaluateAllDevices();
    expect(mockEmit).toHaveBeenCalledTimes(2);

    mockEmit.mockClear();
    mockFindAll.mockResolvedValue([makeDevice({ lastSeen: new Date(Date.now() - 90000) })]);
    const transitions = await evaluateAllDevices();
    expect(transitions).toHaveLength(0);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits DeviceOnline when a device recovers', async () => {
    mockFindAll.mockResolvedValue([makeDevice({ lastSeen: new Date(Date.now() - 70000) })]);
    await evaluateAllDevices();

    mockEmit.mockClear();
    mockFindAll.mockResolvedValue([makeDevice({ lastSeen: new Date(Date.now() - 5000) })]);
    const transitions = await evaluateAllDevices();
    expect(transitions[0].to.connectivity).toBe('ONLINE');

    const healthEvents = mockEmit.mock.calls.filter(([event]) => event === 'device_health');
    expect(healthEvents.some(([, payload]) => payload.event === 'DeviceOnline')).toBe(true);
  });

  it('evaluateDevice: baseline then transition on status change', async () => {
    mockFindByPk.mockResolvedValue(makeDevice({ deviceId: 'wd-eval' }));
    const first = await evaluateDevice('wd-eval');
    expect(first.newStatus.connectivity).toBe('ONLINE');
    expect(mockEmit).not.toHaveBeenCalled();

    mockEmit.mockClear();
    mockFindByPk.mockResolvedValue(makeDevice({ deviceId: 'wd-eval', lastSeen: new Date(Date.now() - 70000) }));
    const second = await evaluateDevice('wd-eval');
    expect(second.newStatus.connectivity).toBe('OFFLINE');
    expect(mockEmit).toHaveBeenCalledWith(
      'device_status_changed',
      expect.objectContaining({
        deviceId: 'wd-eval',
        status: expect.objectContaining({ connectivity: 'OFFLINE' }),
      }),
    );
  });
});
