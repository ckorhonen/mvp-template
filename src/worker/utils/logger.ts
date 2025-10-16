/**
 * Logging utilities for Cloudflare Workers
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export class Logger {
  constructor(
    private level: LogLevel = LogLevel.INFO,
    private context: LogContext = {}
  ) {}

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.level) return;

    const logData = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      ...this.context,
      ...(data && { data }),
    };

    console.log(JSON.stringify(logData));
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: unknown): void {
    this.log(LogLevel.ERROR, message, {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });
  }

  withContext(context: LogContext): Logger {
    return new Logger(this.level, { ...this.context, ...context });
  }
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
