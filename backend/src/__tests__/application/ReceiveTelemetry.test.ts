import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FixedClock, SequentialUUID } from '../../shared/index.js';
import { ReceiveTelemetry } from '../../application/use-cases/ReceiveTelemetry.js';
import { Run, RunId, Telemetry, ChamberId, RecipeId } from '../../domain/index.js';
import type { TelemetryRepository, RunRepository } from '../../domain/index.js';

describe('ReceiveTelemetry', () => {
  let clock: FixedClock;
  let uuid: SequentialUUID;
  let mockEventBus: { publish: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clock = new FixedClock(new Date('2026-01-01'));
    uuid = new SequentialUUID();
    mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
  });

  it('saves valid telemetry', async () => {
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: clock.now(),
    });

    const mockTelemetryRepo: TelemetryRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findLatestByRunId: vi.fn().mockResolvedValue(null),
      findByRunIdAndTimeRange: vi.fn().mockResolvedValue([]),
    };
    const mockRunRepo: RunRepository = {
      findById: vi.fn().mockResolvedValue(run),
      findByChamberId: vi.fn().mockResolvedValue(null),
      findActiveRuns: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const receiveTelemetry = new ReceiveTelemetry(mockTelemetryRepo, mockRunRepo, mockEventBus, uuid, clock);
    const result = await receiveTelemetry.execute({
      runId: 'run-1',
      deviceId: 'esp32_001',
      temperature: 24.5,
      humidity: 85.2,
      co2: 420,
      voc: 15,
      aqi: 1,
      ssrState: [0, 0, 1, 0],
      wifiRssi: -65,
    });

    expect(result.isOk()).toBe(true);
    expect(mockTelemetryRepo.save).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });

  it('rejects invalid temperature', async () => {
    const mockTelemetryRepo: TelemetryRepository = {
      save: vi.fn(),
      findLatestByRunId: vi.fn(),
      findByRunIdAndTimeRange: vi.fn(),
    };
    const mockRunRepo: RunRepository = {
      findById: vi.fn(),
      findByChamberId: vi.fn(),
      findActiveRuns: vi.fn(),
      save: vi.fn(),
    };

    const receiveTelemetry = new ReceiveTelemetry(mockTelemetryRepo, mockRunRepo, mockEventBus, uuid, clock);
    const result = await receiveTelemetry.execute({
      runId: 'run-1',
      deviceId: 'esp32_001',
      temperature: 60,
      humidity: 85,
      co2: 420,
      voc: 15,
      aqi: 1,
      ssrState: [],
      wifiRssi: -65,
    });

    expect(result.isErr()).toBe(true);
    expect(mockTelemetryRepo.save).not.toHaveBeenCalled();
  });
});
