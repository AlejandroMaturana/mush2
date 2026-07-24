import { describe, it, expect } from 'vitest';
import { CryptoUUID, SequentialUUID } from '../../shared/UUID.js';

describe('UUID', () => {
  describe('CryptoUUID', () => {
    it('generates a valid UUID v4', () => {
      const uuid = new CryptoUUID();
      const id = uuid.generate();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('generates unique IDs', () => {
      const uuid = new CryptoUUID();
      const ids = new Set(Array.from({ length: 100 }, () => uuid.generate()));
      expect(ids.size).toBe(100);
    });
  });

  describe('SequentialUUID', () => {
    it('generates sequential IDs', () => {
      const uuid = new SequentialUUID();
      expect(uuid.generate()).toBe('id-1');
      expect(uuid.generate()).toBe('id-2');
      expect(uuid.generate()).toBe('id-3');
    });

    it('reset starts from 1 again', () => {
      const uuid = new SequentialUUID();
      uuid.generate();
      uuid.generate();
      uuid.reset();
      expect(uuid.generate()).toBe('id-1');
    });
  });
});
