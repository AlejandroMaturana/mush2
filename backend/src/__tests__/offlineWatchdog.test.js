import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';

const mockEvaluateAllDevices = jest.fn();

jest.unstable_mockModule('../services/deviceHealthService.js', () => ({
  evaluateAllDevices: mockEvaluateAllDevices,
}));

const { startOfflineWatchdog, stopOfflineWatchdog } = await import('../jobs/offlineWatchdog.js');

describe('offlineWatchdog (ISSUE-007/ISSUE-028)', () => {
  beforeEach(() => {
    mockEvaluateAllDevices.mockReset();
    mockEvaluateAllDevices.mockResolvedValue([]);
  });

  afterEach(() => {
    stopOfflineWatchdog();
    jest.useRealTimers();
  });

  it('I007: runs immediately on start and then on each interval', async () => {
    jest.useFakeTimers();
    startOfflineWatchdog();
    await Promise.resolve();
    expect(mockEvaluateAllDevices).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    expect(mockEvaluateAllDevices).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    expect(mockEvaluateAllDevices).toHaveBeenCalledTimes(3);
  });

  it('I028: does not overlap while a run is in flight', async () => {
    jest.useFakeTimers();

    let resolveFirst;
    mockEvaluateAllDevices.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));

    startOfflineWatchdog();
    await Promise.resolve();
    expect(mockEvaluateAllDevices).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    expect(mockEvaluateAllDevices).toHaveBeenCalledTimes(1);

    resolveFirst([]);
    await Promise.resolve();
    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    expect(mockEvaluateAllDevices).toHaveBeenCalledTimes(2);
  });

  it('I028: calls unref() on the interval handle', async () => {
    const handle = { unref: jest.fn(), ref: jest.fn() };
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(handle);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    startOfflineWatchdog();
    await Promise.resolve();

    expect(setIntervalSpy).toHaveBeenCalled();
    expect(handle.unref).toHaveBeenCalled();

    stopOfflineWatchdog();
    expect(clearIntervalSpy).toHaveBeenCalledWith(handle);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
