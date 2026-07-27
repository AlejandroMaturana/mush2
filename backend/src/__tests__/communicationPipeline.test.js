import { jest } from '@jest/globals';

const mockUpdate = jest.fn().mockResolvedValue(true);
const mockEmit = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Device: {
    findOne: jest.fn().mockResolvedValue({
      id: 1,
      deviceId: 'test-device-001',
      lifecycle: 'ACTIVE',
      lastSeen: new Date(Date.now() - 5000),
      lastTelemetryAt: null,
      lastCommandAt: null,
      lastAckAt: null,
      heartbeatInterval: 10,
      staleMultiplier: 3,
      offlineMultiplier: 6,
      maintenanceMode: false,
      update: mockUpdate,
    }),
  },
  DeviceHealth: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

jest.unstable_mockModule('../services/eventBus.js', () => ({
  events: { emit: mockEmit },
}));

const { recordIncoming, recordOutgoing, recordEvent } = await import('../services/deviceHealthService.js');

describe('Communication Event Pipeline (ADR-026)', () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockUpdate.mockResolvedValue(true);
    mockEmit.mockClear();
  });

  describe('recordIncoming', () => {
    it('always updates lastSeen', async () => {
      await recordIncoming('test-device-001', 'telemetry');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastSeen).toBeInstanceOf(Date);
    });

    it('updates lastTelemetryAt for telemetry events', async () => {
      await recordIncoming('test-device-001', 'telemetry');
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastTelemetryAt).toBeInstanceOf(Date);
    });

    it('updates lastAckAt for ack events', async () => {
      await recordIncoming('test-device-001', 'ack');
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastAckAt).toBeInstanceOf(Date);
    });

    it('does NOT update lastCommandAt for incoming events', async () => {
      await recordIncoming('test-device-001', 'telemetry');
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastCommandAt).toBeUndefined();
    });

    it('does NOT update sub-fields for unknown event types', async () => {
      await recordIncoming('test-device-001', 'alarm');
      const updates = mockUpdate.mock.calls[0][0];
      expect(Object.keys(updates)).toEqual(['lastSeen']);
    });

    it('returns null for unknown device', async () => {
      const { Device } = await import('../models/index.js');
      Device.findOne.mockResolvedValueOnce(null);
      const result = await recordIncoming('nonexistent', 'telemetry');
      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('recordOutgoing', () => {
    it('updates lastCommandAt', async () => {
      await recordOutgoing('test-device-001');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastCommandAt).toBeInstanceOf(Date);
    });

    it('does NOT update lastSeen', async () => {
      await recordOutgoing('test-device-001');
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastSeen).toBeUndefined();
    });

    it('returns null for unknown device', async () => {
      const { Device } = await import('../models/index.js');
      Device.findOne.mockResolvedValueOnce(null);
      const result = await recordOutgoing('nonexistent');
      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('recordEvent (backward compat)', () => {
    it('delegates to recordIncoming', async () => {
      await recordEvent('test-device-001', 'telemetry');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates.lastSeen).toBeInstanceOf(Date);
      expect(updates.lastTelemetryAt).toBeInstanceOf(Date);
    });
  });
});
