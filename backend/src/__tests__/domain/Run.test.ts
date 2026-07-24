import { describe, it, expect } from 'vitest';
import { FixedClock } from '../../shared/index.js';
import { Run, RunId, ChamberId, RecipeId } from '../../domain/index.js';

describe('Run', () => {
  const runId = RunId.create('run-1');
  const chamberId = ChamberId.create('chamber-1');
  const recipeId = RecipeId.create('recipe-1');

  it('creates an active run', () => {
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date(),
    });
    expect(run.status).toBe('ACTIVE');
    expect(run.controlState).toBe('NORMAL');
    expect(run.isActive()).toBe(true);
  });

  it('can abort an active run', () => {
    const clock = new FixedClock(new Date('2026-01-01'));
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: clock.now(),
    });
    const result = run.abort(clock);
    expect(result.isOk()).toBe(true);
    expect(run.status).toBe('ABORTED');
    expect(run.abortedAt).toBeDefined();
  });

  it('cannot abort a completed run', () => {
    const clock = new FixedClock(new Date('2026-01-01'));
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'COMPLETED',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: clock.now(),
    });
    const result = run.abort(clock);
    expect(result.isErr()).toBe(true);
  });

  it('can transition phase when active', () => {
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date(),
    });
    const result = run.transitionPhase('FRUITING');
    expect(result.isOk()).toBe(true);
    expect(run.currentPhase).toBe('FRUITING');
  });

  it('cannot transition phase when aborted', () => {
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'ABORTED',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date(),
    });
    const result = run.transitionPhase('FRUITING');
    expect(result.isErr()).toBe(true);
  });

  it('sets control state', () => {
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date(),
    });
    run.setControlState('SAFE_MODE');
    expect(run.controlState).toBe('SAFE_MODE');
  });

  it('serializes to data', () => {
    const run = Run.create({
      id: runId,
      chamberId,
      recipeId,
      status: 'ACTIVE',
      controlState: 'NORMAL',
      currentPhase: 'INCUBATION',
      startedAt: new Date(),
    });
    const data = run.toData();
    expect(data.id).toBe(runId);
    expect(data.status).toBe('ACTIVE');
    expect(data.controlState).toBe('NORMAL');
  });
});
