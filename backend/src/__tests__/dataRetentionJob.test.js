import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';

const mockPurge = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Subscription: { findAll: jest.fn() },
  AuditLog: { destroy: jest.fn() },
  Telemetry: { destroy: jest.fn() },
  Alarm: { destroy: jest.fn() },
  Device: { findAll: jest.fn() },
}));

jest.unstable_mockModule('../services/dataRetentionService.js', () => ({
  purgeExpiredData: mockPurge,
}));

const { startDataRetentionJob, stopDataRetentionJob, runPurge } = await import('../jobs/dataRetentionJob.js');

describe('dataRetentionJob (ISSUE-028)', () => {
  beforeEach(() => {
    mockPurge.mockReset();
    mockPurge.mockResolvedValue({ deletedAudit: 0, deletedTelemetry: 0, deletedAlarms: 0 });
  });

  afterEach(() => {
    stopDataRetentionJob();
    jest.useRealTimers();
  });

  it('runs once on start and then on each interval', async () => {
    jest.useFakeTimers();
    startDataRetentionJob();
    await Promise.resolve();
    expect(mockPurge).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 60 * 1000);
    await Promise.resolve();
    expect(mockPurge).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(60 * 60 * 1000);
    await Promise.resolve();
    expect(mockPurge).toHaveBeenCalledTimes(3);
  });

  it('does not overlap while a run is in flight', async () => {
    let resolveFirst;
    mockPurge.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));

    const first = runPurge();
    await Promise.resolve();
    expect(mockPurge).toHaveBeenCalledTimes(1);

    const second = runPurge();
    await Promise.resolve();
    expect(mockPurge).toHaveBeenCalledTimes(1);

    resolveFirst({ deletedAudit: 0, deletedTelemetry: 0, deletedAlarms: 0 });
    await first;
    await second;

    await runPurge();
    expect(mockPurge).toHaveBeenCalledTimes(2);
  });

  it('calls unref() on the interval handle', async () => {
    const handle = { unref: jest.fn(), ref: jest.fn() };
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(handle);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    startDataRetentionJob();
    await Promise.resolve();

    expect(setIntervalSpy).toHaveBeenCalled();
    expect(handle.unref).toHaveBeenCalled();

    stopDataRetentionJob();
    expect(clearIntervalSpy).toHaveBeenCalledWith(handle);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
