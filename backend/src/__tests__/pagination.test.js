import { describe, it, expect } from '@jest/globals';

const { normalizeLimit, DEFAULT_LIMIT, MAX_LIMIT } = await import('../utils/pagination.js');

describe('normalizeLimit (ISSUE-014)', () => {
  it('uses default when called without arguments', () => {
    expect(normalizeLimit()).toBe(DEFAULT_LIMIT);
  });

  it('uses default when limit is undefined', () => {
    expect(normalizeLimit(undefined)).toBe(DEFAULT_LIMIT);
    expect(normalizeLimit(undefined, 50)).toBe(50);
  });

  it('uses default for non-numeric input', () => {
    expect(normalizeLimit('abc')).toBe(DEFAULT_LIMIT);
  });

  it('uses default for negative values', () => {
    expect(normalizeLimit('-5')).toBe(DEFAULT_LIMIT);
  });

  it('uses default for zero', () => {
    expect(normalizeLimit('0')).toBe(DEFAULT_LIMIT);
    expect(normalizeLimit(0)).toBe(DEFAULT_LIMIT);
  });

  it('clamps values above MAX_LIMIT', () => {
    expect(normalizeLimit('200')).toBe(MAX_LIMIT);
    expect(normalizeLimit(1000)).toBe(MAX_LIMIT);
    expect(MAX_LIMIT).toBe(100);
  });

  it('keeps valid values within range', () => {
    expect(normalizeLimit('50')).toBe(50);
    expect(normalizeLimit('100')).toBe(100);
    expect(normalizeLimit('1')).toBe(1);
  });
});
