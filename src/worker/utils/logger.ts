/**
 * Logger Utility
 * 
 * Structured logging for Cloudflare Workers with support for different log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private minLevel: LogLevel;
  private context: LogContext;

  constructor(minLevel: LogLevel = LogLevel.INFO, context: LogContext = {}) {
    this.minLevel = minLevel;
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.minLevel, { ...this.context, ...context });
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: { ...this.context, ...context },
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(output);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    console.error(JSON.stringify(entry));
  }

  /**
   * Log critical error message
   */
  critical(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    console.error(JSON.stringify(entry));
  }

  /**
   * Time a function execution
   */
  async time<T>(
    label: string,
    fn: () => Promise<T> | T,
    context?: LogContext,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { ...context, duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(
        `${label} failed`,
        error instanceof Error ? error : new Error(String(error)),
        { ...context, duration_ms: duration },
      );
      throw error;
    }
  }
}

/**
 * Create a logger instance with environment-based configuration
 */
export function createLogger(
  env?: { LOG_LEVEL?: string; ENVIRONMENT?: string },
  context?: LogContext,
): Logger {
  let level = LogLevel.INFO;

  if (env?.LOG_LEVEL) {
    const envLevel = env.LOG_LEVEL.toUpperCase();
    if (envLevel in LogLevel) {
      level = LogLevel[envLevel as keyof typeof LogLevel] as LogLevel;
    }
  }

  const baseContext: LogContext = {
    environment: env?.ENVIRONMENT || 'unknown',
    ...context,
  };

  return new Logger(level, baseContext);
}

/**
 * Default logger instance
 */
export const logger = new Logger();
