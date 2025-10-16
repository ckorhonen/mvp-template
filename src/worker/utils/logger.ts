/**
 * Logger utility for structured logging in Cloudflare Workers
 */

import { Env } from '../types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private context: Record<string, any>;

  constructor(level: LogLevel = 'info', context: Record<string, any> = {}) {
    this.level = level;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, data?: any): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(data && { data }),
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
      console.error(this.format('error', message, errorData));
    }
  }

  child(context: Record<string, any>): Logger {
    return new Logger(this.level, { ...this.context, ...context });
  }
}

export function createLogger(env: Env, requestId: string): Logger {
  const level = (env.LOG_LEVEL || 'info') as LogLevel;
  return new Logger(level, {
    environment: env.ENVIRONMENT || 'development',
    request_id: requestId,
  });
}

export { Logger };
