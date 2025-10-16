/**
 * Structured logging utilities for Cloudflare Workers
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * Logger class with structured logging support
 */
export class Logger {
  private level: LogLevel;
  private context: LogContext;

  constructor(level: LogLevel = LogLevel.INFO, context: LogContext = {}) {
    this.level = level;
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.level, { ...this.context, ...context });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, meta);
    }
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, meta);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, meta);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      const errorMeta = error instanceof Error
        ? { error: error.message, stack: error.stack }
        : { error };
      this.log('ERROR', message, { ...errorMeta, ...meta });
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta,
    };

    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Create a logger instance from environment
 */
export function createLogger(env: { LOG_LEVEL?: string }, context: LogContext = {}): Logger {
  const levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };

  const level = levelMap[env.LOG_LEVEL?.toLowerCase() || 'info'] || LogLevel.INFO;
  return new Logger(level, context);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
