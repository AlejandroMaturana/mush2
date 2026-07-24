import { describe, it, expect } from 'vitest';
import { FixedClock, SystemClock } from '../../shared/Clock.js';

describe('Clock', () => {
  describe('SystemClock', () => {
    it('returns current date', () => {
      const clock = new SystemClock();
      const before = new Date();
      const now = clock.now();
      const after = new Date();
      expect(now.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(now.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('FixedClock', () => {
    it('returns fixed date', () => {
      const fixed = new Date('2026-01-01T00:00:00Z');
      const clock = new FixedClock(fixed);
      expect(clock.now()).toBe(fixed);
    });

    it('advance moves time forward', () => {
      const clock = new FixedClock(new Date('2026-01-01T00:00:00Z'));
      clock.advance(60_000);
      expect(clock.now().toISOString()).toBe('2026-01-01T00:01:00.000Z');
    });

    it('set changes the time', () => {
      const clock = new FixedClock(new Date('2026-01-01'));
      const newDate = new Date('2026-12-31');
      clock.set(newDate);
      expect(clock.now()).toBe(newDate);
    });
  });
});
