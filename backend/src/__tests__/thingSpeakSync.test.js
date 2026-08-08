import { jest } from '@jest/globals';

const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockFindAll = jest.fn();
const mockCreate = jest.fn();
const mockSensorFindOrCreate = jest.fn();
const mockRecordIncoming = jest.fn();
const mockLogInfo = jest.fn();
const mockLogError = jest.fn();
const mockFetch = jest.fn();

jest.unstable_mockModule('../config/env.js', () => ({
  env: { TS: { host: 'api.thingspeak.com' } },
}));

jest.unstable_mockModule('../models/index.js', () => ({
  Device: {
    findByPk: mockFindByPk,
    findAll: mockFindAll,
    sequelize: { Op: { ne: 'ne' } },
  },
  Telemetry: { create: mockCreate },
  Sensor: { findOrCreate: mockSensorFindOrCreate },
  IntegrationCredentials: { findOne: mockFindOne },
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: mockLogInfo, error: mockLogError }),
  default: {},
}));

jest.unstable_mockModule('../services/deviceHealthService.js', () => ({
  recordIncoming: mockRecordIncoming,
}));

const { syncDeviceFromThingSpeak, syncAllFromThingSpeak } = await import('../services/thingSpeakSync.js');

function makeDevice(overrides = {}) {
  return {
    id: 1,
    deviceId: 'dev-001',
    thingSpeakEnabled: true,
    thingSpeakChannelId: '123456',
    thingSpeakSyncInterval: 300000,
    ...overrides,
  };
}

function makeCredentials(readKey = 'DECRYPTED_RK', overrides = {}) {
  return {
    getDecryptedCredentials: () => ({ readKey, channelId: '123456', ...overrides }),
  };
}

function makeFeed() {
  return {
    channel_id: 1,
    entry_id: 99,
    created_at: '2026-01-01T00:00:00.000Z',
    field1: '25.5',
    field2: '60.0',
    field3: '800',
    field4: '10',
  };
}

describe('ThingSpeakSync (ISSUE-043)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeFeed() });
    mockFindByPk.mockResolvedValue(makeDevice());
    mockFindOne.mockResolvedValue(makeCredentials());
    mockSensorFindOrCreate.mockResolvedValue([{ id: 1 }]);
    mockCreate.mockResolvedValue({});
    mockRecordIncoming.mockResolvedValue();
  });

  describe('syncDeviceFromThingSpeak', () => {
    it('returns early when device is not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await syncDeviceFromThingSpeak(1);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns early when thingSpeakEnabled is false', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ thingSpeakEnabled: false }));

      await syncDeviceFromThingSpeak(1);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses readKey from IntegrationCredentials (encrypted source of truth)', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ id: 10, thingSpeakReadKey: null }));
      mockFindOne.mockResolvedValue(makeCredentials('SECRET_READ_KEY'));

      await syncDeviceFromThingSpeak(10);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/channels/123456/feeds/last.json');
      expect(url).toContain('api_key=SECRET_READ_KEY');
      expect(mockCreate).toHaveBeenCalledTimes(4);
      expect(mockRecordIncoming).toHaveBeenCalledWith('dev-001', 'telemetry');
    });

    it('does NOT read readKey from Device.thingSpeakReadKey (removed in ISSUE-043)', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ id: 11, thingSpeakReadKey: 'LEGACY_PLAINTEXT' }));
      mockFindOne.mockResolvedValue(null);

      await syncDeviceFromThingSpeak(11);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('logs NO_KEYS and skips when no IntegrationCredentials exist', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ id: 12 }));
      mockFindOne.mockResolvedValue(null);

      await syncDeviceFromThingSpeak(12);

      expect(mockFetch).not.toHaveBeenCalled();
      const event = mockLogInfo.mock.calls.find((call) => call[0].event === 'NO_KEYS');
      expect(event).toBeDefined();
    });

    it('skips when decrypted credentials are unreadable', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ id: 13 }));
      mockFindOne.mockResolvedValue({ getDecryptedCredentials: () => null });

      await syncDeviceFromThingSpeak(13);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throttles based on thingSpeakSyncInterval from Device', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ id: 14, thingSpeakSyncInterval: 300000 }));
      mockFindOne.mockResolvedValue(makeCredentials('RK'));

      await syncDeviceFromThingSpeak(14);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await syncDeviceFromThingSpeak(14);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncAllFromThingSpeak', () => {
    it('queries devices with thingSpeakEnabled and channelId, then syncs each', async () => {
      mockFindAll.mockResolvedValue([
        makeDevice({ id: 10, deviceId: 'dev-010' }),
        makeDevice({ id: 11, deviceId: 'dev-011' }),
      ]);

      await syncAllFromThingSpeak();

      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.thingSpeakEnabled).toBe(true);
      expect(where.thingSpeakChannelId.ne).toBe(null);
      expect(mockFindByPk).toHaveBeenCalledWith(10);
      expect(mockFindByPk).toHaveBeenCalledWith(11);
    });
  });
});
