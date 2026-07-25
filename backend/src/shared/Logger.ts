import { createChildLogger } from '../config/pino.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: string, data?: Record<string, unknown>): void;
  info(message: string, context?: string, data?: Record<string, unknown>): void;
  warn(message: string, context?: string, data?: Record<string, unknown>): void;
  error(message: string, context?: string, data?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  private logger;

  constructor(context?: string) {
    this.logger = createChildLogger(context || 'APP');
  }

  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.debug({ module: context, ...data }, message);
  }

  info(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.info({ module: context, ...data }, message);
  }

  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.warn({ module: context, ...data }, message);
  }

  error(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.error({ module: context, ...data }, message);
  }
}
