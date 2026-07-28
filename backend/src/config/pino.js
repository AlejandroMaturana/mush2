import pino from 'pino';
import { env } from './env.js';

const isProduction = env.NODE_ENV === 'production';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l' } },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
});

export function createChildLogger(moduleName) {
  return logger.child({ module: moduleName });
}

export default logger;
