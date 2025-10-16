/**
 * Logging Utilities for Cloudflare Workers
 * Provides structured logging with different levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = 'info') {
    this.context = context;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...this.context,
      ...(data && { data }),
    };
    return JSON.stringify(logData);
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context }, this.minLevel);
  }
}

/**
 * Create logger from request
 * @param request - Request object
 * @param env - Environment bindings
 * @returns Logger instance
 */
export function createLogger(
  request: Request,
  env: any
): Logger {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();

  return new Logger(
    {
      requestId,
      method: request.method,
      path: url.pathname,
      userAgent: request.headers.get('User-Agent') || undefined,
    },
    (env.LOG_LEVEL as LogLevel) || 'info'
  );
}
