import { describe, it, expect } from 'vitest';
import { Ok, Err, isOk, isErr, unwrapFromResult } from '../../shared/Result.js';

describe('Result', () => {
  describe('Ok', () => {
    it('creates an Ok result with value', () => {
      const result = Ok(42);
      expect(result.value).toBe(42);
      expect(result._tag).toBe('Ok');
    });

    it('isOk returns true', () => {
      const result = Ok('hello');
      expect(result.isOk()).toBe(true);
    });

    it('isErr returns false', () => {
      const result = Ok(42);
      expect(result.isErr()).toBe(false);
    });

    it('map transforms the value', () => {
      const result = Ok(42);
      const mapped = result.map(v => v * 2);
      expect(mapped.value).toBe(84);
    });

    it('flatMap chains operations', () => {
      const result = Ok(42);
      const chained = result.flatMap(v => Ok(v.toString()));
      expect(chained.value).toBe('42');
    });

    it('unwrap returns the value', () => {
      const result = Ok(42);
      expect(result.unwrap()).toBe(42);
    });

    it('unwrapOr returns the value', () => {
      const result = Ok(42);
      expect(result.unwrapOr(0)).toBe(42);
    });
  });

  describe('Err', () => {
    it('creates an Err result with error', () => {
      const result = Err('something went wrong');
      expect(result.error).toBe('something went wrong');
      expect(result._tag).toBe('Err');
    });

    it('isOk returns false', () => {
      const result = Err('error');
      expect(result.isOk()).toBe(false);
    });

    it('isErr returns true', () => {
      const result = Err('error');
      expect(result.isErr()).toBe(true);
    });

    it('map does not transform', () => {
      const result = Err('error');
      const mapped = result.map(() => 42);
      expect(mapped.isErr()).toBe(true);
      expect(mapped.error).toBe('error');
    });

    it('mapErr transforms the error', () => {
      const result = Err('old error');
      const mapped = result.mapErr(e => `${e} (mapped)`);
      expect(mapped.error).toBe('old error (mapped)');
    });

    it('unwrap throws', () => {
      const result = Err('error');
      expect(() => result.unwrap()).toThrow('unwrap() called on Err');
    });

    it('unwrapOr returns the fallback', () => {
      const result = Err('error');
      expect(result.unwrapOr(42)).toBe(42);
    });
  });

  describe('type guards', () => {
    it('isOk identifies Ok results', () => {
      expect(isOk(Ok(42))).toBe(true);
      expect(isOk(Err('error'))).toBe(false);
    });

    it('isErr identifies Err results', () => {
      expect(isErr(Ok(42))).toBe(false);
      expect(isErr(Err('error'))).toBe(true);
    });
  });

  describe('unwrapFromResult', () => {
    it('returns value for Ok', () => {
      expect(unwrapFromResult(Ok(42))).toBe(42);
    });

    it('throws for Err', () => {
      expect(() => unwrapFromResult(Err('error'))).toThrow();
    });
  });
});
