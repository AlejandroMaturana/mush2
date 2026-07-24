import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FixedClock, Ok } from '../../shared/index.js';
import { AbortRun } from '../../application/use-cases/AbortRun.js';
import { Run, RunId, ChamberId, RecipeId } from '../../domain/index.js';
import type { RunRepository } from '../../domain/index.js';

describe('AbortRun', () => {
  let clock: FixedClock;
  let mockEventBus: { publish: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clock = new FixedClock(new Date('2026-01-01'));
    mockEventBus = { publish: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
  });

  it('aborts an active run', async () => {
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: clock.now(),
    });

    const mockRunRepo: RunRepository = {
      findById: vi.fn().mockResolvedValue(run),
      findByChamberId: vi.fn().mockResolvedValue(null),
      findActiveRuns: vi.fn().mockResolvedValue([run]),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const abortRun = new AbortRun(mockRunRepo, mockEventBus, clock);
    const result = await abortRun.execute({ runId: 'run-1', reason: 'Testing' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe('ABORTED');
    }
    expect(mockRunRepo.save).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
  });

  it('cannot abort a completed run', async () => {
    const run = Run.create({
      id: RunId.create('run-1'),
      chamberId: ChamberId.create('chamber-1'),
      recipeId: RecipeId.create('recipe-1'),
      status: 'COMPLETED',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: clock.now(),
    });

    const mockRunRepo: RunRepository = {
      findById: vi.fn().mockResolvedValue(run),
      findByChamberId: vi.fn().mockResolvedValue(null),
      findActiveRuns: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const abortRun = new AbortRun(mockRunRepo, mockEventBus, clock);
    const result = await abortRun.execute({ runId: 'run-1' });

    expect(result.isErr()).toBe(true);
    expect(mockRunRepo.save).not.toHaveBeenCalled();
  });
});
