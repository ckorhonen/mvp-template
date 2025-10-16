/**
 * Logger Utility
 * 
 * Structured logging for Cloudflare Workers
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private level: LogLevel;
  private context: LogContext;

  constructor(level: LogLevel = 'info', context: LogContext = {}) {
    this.level = level;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const ctx = { ...this.context, ...context };
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...ctx,
    });
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error instanceof Error
        ? { error: error.message, stack: error.stack }
        : { error };
      console.error(this.formatMessage('error', message, { ...errorContext, ...context }));
    }
  }

  child(context: LogContext): Logger {
    return new Logger(this.level, { ...this.context, ...context });
  }
}

/**
 * Create a logger instance
 */
export function createLogger(level: LogLevel = 'info', context?: LogContext): Logger {
  return new Logger(level, context);
}
