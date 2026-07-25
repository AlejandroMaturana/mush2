import { describe, it, expect, vi } from 'vitest';
import { ConsoleLogger } from '../../shared/Logger.js';

vi.mock('../../config/pino.js', () => {
  const noop = () => {};
  const childLogger = { info: noop, error: noop, warn: noop, debug: noop };
  return {
    createChildLogger: () => childLogger,
    default: childLogger,
  };
});

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    it('info logs a message without throwing', () => {
      const logger = new ConsoleLogger();
      expect(() => logger.info('test message', 'TestContext')).not.toThrow();
    });

    it('error logs without throwing', () => {
      const logger = new ConsoleLogger();
      expect(() => logger.error('error message', 'TestContext', { code: 500 })).not.toThrow();
    });

    it('warn logs without throwing', () => {
      const logger = new ConsoleLogger();
      expect(() => logger.warn('warn message')).not.toThrow();
    });

    it('debug logs without throwing', () => {
      const logger = new ConsoleLogger();
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('implements Logger interface', () => {
      const logger = new ConsoleLogger();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });
});
