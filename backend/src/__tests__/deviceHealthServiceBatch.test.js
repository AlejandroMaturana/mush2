import { jest, describe, it, beforeEach } from '@jest/globals';

const mockDeviceHealthFindAll = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Device: { findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() },
  DeviceHealth: { findAll: mockDeviceHealthFindAll, findOne: jest.fn() },
}));

jest.unstable_mockModule('../services/eventBus.js', () => ({
  events: { emit: jest.fn() },
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

const { getLatestHealthByDeviceIds } = await import('../services/deviceHealthService.js');

describe('getLatestHealthByDeviceIds batch (ISSUE-014)', () => {
  beforeEach(() => {
    mockDeviceHealthFindAll.mockReset();
  });

  it('returns the most recent health row per device', async () => {
    mockDeviceHealthFindAll.mockResolvedValue([
      { id: 2, deviceId: 1, timestamp: new Date('2026-08-15T11:00:00Z'), freeHeap: 200 },
      { id: 1, deviceId: 1, timestamp: new Date('2026-08-15T10:00:00Z'), freeHeap: 100 },
      { id: 3, deviceId: 2, timestamp: new Date('2026-08-15T09:00:00Z'), freeHeap: 300 },
    ]);

    const map = await getLatestHealthByDeviceIds([1, 2]);

    expect(mockDeviceHealthFindAll).toHaveBeenCalledTimes(1);
    expect(mockDeviceHealthFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deviceId: expect.any(Object) }),
      order: [['timestamp', 'DESC']],
      raw: true,
    }));
    expect(map.size).toBe(2);
    expect(map.get(1)).toEqual({ id: 2, deviceId: 1, timestamp: new Date('2026-08-15T11:00:00Z'), freeHeap: 200 });
    expect(map.get(2)).toEqual({ id: 3, deviceId: 2, timestamp: new Date('2026-08-15T09:00:00Z'), freeHeap: 300 });
  });

  it('returns an empty Map and does not query when deviceIds is empty', async () => {
    const map = await getLatestHealthByDeviceIds([]);
    expect(map.size).toBe(0);
    expect(mockDeviceHealthFindAll).not.toHaveBeenCalled();
  });

  it('returns an empty Map for null input without querying', async () => {
    const map = await getLatestHealthByDeviceIds(null);
    expect(map.size).toBe(0);
    expect(mockDeviceHealthFindAll).not.toHaveBeenCalled();
  });
});
