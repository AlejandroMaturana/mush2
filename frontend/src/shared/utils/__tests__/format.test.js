import { describe, it, expect } from 'vitest';
import { formatNumber, formatBytes, formatUptime, formatJSON } from '../format';

describe('formatNumber', () => {
  it('formatea número con decimales', () => {
    expect(formatNumber(24.567, 1)).toBe('24.6');
  });

  it('retorna -- para null', () => {
    expect(formatNumber(null)).toBe('--');
  });

  it('retorna -- para NaN', () => {
    expect(formatNumber(NaN)).toBe('--');
  });

  it('default decimals = 0', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatBytes', () => {
  it('formatea bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formatea KB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formatea MB', () => {
    expect(formatBytes(2097152)).toBe('2.0 MB');
  });

  it('retorna -- para null', () => {
    expect(formatBytes(null)).toBe('--');
  });
});

describe('formatUptime', () => {
  it('formatea minutos', () => {
    expect(formatUptime(300)).toBe('5m');
  });

  it('formatea horas y minutos', () => {
    expect(formatUptime(3900)).toBe('1h 5m');
  });

  it('formatea dias y horas', () => {
    expect(formatUptime(90000)).toBe('1d 1h');
  });

  it('retorna -- para null', () => {
    expect(formatUptime(null)).toBe('--');
  });
});

describe('formatJSON', () => {
  it('formatea objeto como JSON', () => {
    expect(formatJSON({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('formatea string JSON', () => {
    expect(formatJSON('{"b":2}')).toBe('{\n  "b": 2\n}');
  });

  it('retorna -- para null/undefined', () => {
    expect(formatJSON(null)).toBe('--');
    expect(formatJSON(undefined)).toBe('--');
  });

  it('retorna string para JSON inválido', () => {
    expect(formatJSON('not-json')).toBe('not-json');
  });
});
