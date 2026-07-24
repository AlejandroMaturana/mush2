import { describe, it, expect } from 'vitest';
import { TemperatureRange } from '../../domain/value-objects/TemperatureRange.js';

describe('TemperatureRange', () => {
  it('creates a valid range', () => {
    const result = TemperatureRange.create(18, 28);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.min).toBe(18);
      expect(result.value.max).toBe(28);
    }
  });

  it('rejects min > max', () => {
    const result = TemperatureRange.create(30, 20);
    expect(result.isErr()).toBe(true);
  });

  it('rejects out of range values', () => {
    const result = TemperatureRange.create(-20, 28);
    expect(result.isErr()).toBe(true);
  });

  it('contains value in range', () => {
    const result = TemperatureRange.create(18, 28);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.contains(23)).toBe(true);
      expect(result.value.contains(18)).toBe(true);
      expect(result.value.contains(28)).toBe(true);
    }
  });

  it('detects above range', () => {
    const result = TemperatureRange.create(18, 28);
    if (result.isOk()) {
      expect(result.value.isAbove(30)).toBe(true);
      expect(result.value.isAbove(25)).toBe(false);
    }
  });

  it('detects below range', () => {
    const result = TemperatureRange.create(18, 28);
    if (result.isOk()) {
      expect(result.value.isBelow(15)).toBe(true);
      expect(result.value.isBelow(20)).toBe(false);
    }
  });

  it('serializes to JSON', () => {
    const result = TemperatureRange.create(18, 28);
    if (result.isOk()) {
      expect(result.value.toJSON()).toEqual({ min: 18, max: 28, unit: '°C' });
    }
  });
});
