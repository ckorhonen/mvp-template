/**
 * Structured logging utility for Cloudflare Workers
 * Provides consistent logging with request context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = 'info') {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * Format log message
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    data?: unknown
  ): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...this.context,
      ...(data && { data }),
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, data?: unknown): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            ...data,
          }
        : { error, ...data };

      console.error(this.formatMessage('error', message, errorData));
    }
  }
}

/**
 * Create a logger from a request
 */
export function createRequestLogger(
  request: Request,
  requestId: string,
  minLevel: LogLevel = 'info'
): Logger {
  const url = new URL(request.url);
  
  return new Logger(
    {
      requestId,
      method: request.method,
      path: url.pathname,
      userAgent: request.headers.get('user-agent') || undefined,
    },
    minLevel
  );
}
