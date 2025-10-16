import type { Env } from '../types/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured logger for Cloudflare Workers
 */
export class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string, logLevel: LogLevel = 'info') {
    this.context = context;
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...meta,
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(context: string, env?: Env): Logger {
  const logLevel = env?.LOG_LEVEL || 'info';
  return new Logger(context, logLevel);
}
