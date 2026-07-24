import { describe, it, expect, vi } from 'vitest';
import { ConsoleLogger } from '../../shared/Logger.js';

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    it('info logs a message', () => {
      const logger = new ConsoleLogger();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('test message', 'TestContext');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('error logs to console.error', () => {
      const logger = new ConsoleLogger();
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('error message', 'TestContext', { code: 500 });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('warn logs to console.warn', () => {
      const logger = new ConsoleLogger();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('warn message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('debug logs to console.log', () => {
      const logger = new ConsoleLogger();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.debug('debug message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
