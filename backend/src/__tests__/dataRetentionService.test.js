import { jest, describe, it, beforeEach } from '@jest/globals';
import { Op } from 'sequelize';

const mockSubFindAll = jest.fn();
const mockDeviceFindAll = jest.fn();
const mockAuditDestroy = jest.fn();
const mockTelemetryDestroy = jest.fn();
const mockAlarmDestroy = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Subscription: { findAll: mockSubFindAll },
  Device: { findAll: mockDeviceFindAll },
  AuditLog: { destroy: mockAuditDestroy },
  Telemetry: { destroy: mockTelemetryDestroy },
  Alarm: { destroy: mockAlarmDestroy },
}));

const { purgeExpiredData } = await import('../services/dataRetentionService.js');

describe('dataRetentionService (ISSUE-010)', () => {
  beforeEach(() => {
    mockSubFindAll.mockReset();
    mockDeviceFindAll.mockReset();
    mockAuditDestroy.mockReset();
    mockTelemetryDestroy.mockReset();
    mockAlarmDestroy.mockReset();
  });

  it('per-device cutoff: groups devices by owner retention and purges each group with its own cutoff', async () => {
    const now = new Date('2026-03-15T00:00:00Z');
    mockSubFindAll.mockResolvedValue([
      { userId: 'u-free', dataRetentionDays: 30 },
      { userId: 'u-prem', dataRetentionDays: 365 },
    ]);
    mockDeviceFindAll.mockResolvedValue([
      { id: 1, userId: 'u-free' },
      { id: 2, userId: 'u-prem' },
    ]);
    mockAuditDestroy.mockResolvedValue(5);
    mockTelemetryDestroy.mockResolvedValue(10);
    mockAlarmDestroy.mockResolvedValue(3);

    const result = await purgeExpiredData({ now });

    expect(result).toEqual({ deletedAudit: 10, deletedTelemetry: 20, deletedAlarms: 6 });

    const cutoffFree = new Date('2026-02-13T00:00:00Z');
    const cutoffPrem = new Date('2025-03-15T00:00:00Z');

    expect(mockTelemetryDestroy).toHaveBeenCalledWith({
      where: { deviceId: { [Op.in]: [1] }, timestamp: { [Op.lt]: cutoffFree } },
    });
    expect(mockTelemetryDestroy).toHaveBeenCalledWith({
      where: { deviceId: { [Op.in]: [2] }, timestamp: { [Op.lt]: cutoffPrem } },
    });
    expect(mockAlarmDestroy).toHaveBeenCalledWith({
      where: { deviceId: { [Op.in]: [1] }, createdAt: { [Op.lt]: cutoffFree } },
    });
    expect(mockAlarmDestroy).toHaveBeenCalledWith({
      where: { deviceId: { [Op.in]: [2] }, createdAt: { [Op.lt]: cutoffPrem } },
    });
  });

  it('mixed values: PREMIUM device retains older telemetry, FREE device purges it', async () => {
    const now = new Date('2026-03-15T00:00:00Z');
    mockSubFindAll.mockResolvedValue([
      { userId: 'u-free', dataRetentionDays: 30 },
      { userId: 'u-prem', dataRetentionDays: 365 },
    ]);
    mockDeviceFindAll.mockResolvedValue([
      { id: 1, userId: 'u-free' },
      { id: 2, userId: 'u-prem' },
    ]);
    mockTelemetryDestroy.mockResolvedValue(0);
    mockAlarmDestroy.mockResolvedValue(0);

    await purgeExpiredData({ now });

    const freeCalls = mockTelemetryDestroy.mock.calls.filter(([args]) => args.where.deviceId[Op.in].includes(1));
    const premCalls = mockTelemetryDestroy.mock.calls.filter(([args]) => args.where.deviceId[Op.in].includes(2));

    expect(freeCalls).toHaveLength(1);
    expect(premCalls).toHaveLength(1);

    const freeCutoff = freeCalls[0][0].where.timestamp[Op.lt].getTime();
    const premCutoff = premCalls[0][0].where.timestamp[Op.lt].getTime();

    expect(premCutoff).toBeLessThan(freeCutoff);
    expect(now.getTime() - premCutoff).toBe(365 * 24 * 60 * 60 * 1000);
    expect(now.getTime() - freeCutoff).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('audit logs are purged per user with their own cutoff', async () => {
    const now = new Date('2026-03-15T00:00:00Z');
    mockSubFindAll.mockResolvedValue([
      { userId: 'u-free', dataRetentionDays: 30 },
      { userId: 'u-prem', dataRetentionDays: 365 },
    ]);
    mockDeviceFindAll.mockResolvedValue([]);
    mockAuditDestroy.mockResolvedValue(1);

    await purgeExpiredData({ now });

    expect(mockAuditDestroy).toHaveBeenCalledWith({
      where: { userId: 'u-free', createdAt: { [Op.lt]: new Date('2026-02-13T00:00:00Z') } },
    });
    expect(mockAuditDestroy).toHaveBeenCalledWith({
      where: { userId: 'u-prem', createdAt: { [Op.lt]: new Date('2025-03-15T00:00:00Z') } },
    });
  });

  it('devices without an active subscription owner fall back to the default retention', async () => {
    const now = new Date('2026-03-15T00:00:00Z');
    mockSubFindAll.mockResolvedValue([]);
    mockDeviceFindAll.mockResolvedValue([{ id: 7, userId: null }]);
    mockAuditDestroy.mockResolvedValue(0);
    mockTelemetryDestroy.mockResolvedValue(0);
    mockAlarmDestroy.mockResolvedValue(0);

    await purgeExpiredData({ now });

    const defaultCutoff = new Date('2026-02-13T00:00:00Z');
    expect(mockTelemetryDestroy).toHaveBeenCalledWith({
      where: { deviceId: { [Op.in]: [7] }, timestamp: { [Op.lt]: defaultCutoff } },
    });
  });

  it('skips cleanly when no active subscriptions and no devices', async () => {
    mockSubFindAll.mockResolvedValue([]);
    mockDeviceFindAll.mockResolvedValue([]);
    mockAuditDestroy.mockResolvedValue(0);

    const result = await purgeExpiredData({ now: new Date('2026-03-15T00:00:00Z') });
    expect(result).toEqual({ deletedAudit: 0, deletedTelemetry: 0, deletedAlarms: 0 });
  });
});
