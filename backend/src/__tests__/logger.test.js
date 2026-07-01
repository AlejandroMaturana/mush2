import { formatLogPrefix } from '../services/logger.js';

describe('logger', () => {
  it('formats a local timestamp prefix for terminal logs', () => {
    const date = new Date('2026-06-30T15:04:05.123Z');

    expect(formatLogPrefix(date, 'America/Santiago')).toBe('[2026-06-30 11:04:05 America/Santiago]');
  });
});
