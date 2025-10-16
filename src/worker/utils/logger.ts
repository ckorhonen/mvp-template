/**
 * Structured Logging Utility
 * 
 * Provides consistent logging throughout the application.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
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
  child(context: LogContext): Logger {
    return new Logger(
      { ...this.context, ...context },
      this.minLevel
    );
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * Format log entry
   */
  private formatLog(level: LogLevel, message: string, data?: LogContext): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };
    return JSON.stringify(entry);
  }

  /**
   * Debug log
   */
  debug(message: string, data?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message, data));
    }
  }

  /**
   * Info log
   */
  info(message: string, data?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatLog('info', message, data));
    }
  }

  /**
   * Warning log
   */
  warn(message: string, data?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, data));
    }
  }

  /**
   * Error log
   */
  error(message: string, error?: Error | unknown, data?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorData: LogContext = { ...data };
      
      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error) {
        errorData.error = error;
      }

      console.error(this.formatLog('error', message, errorData));
    }
  }
}

/**
 * Create logger instance
 */
export function createLogger(context?: LogContext, minLevel?: LogLevel): Logger {
  return new Logger(context, minLevel);
}
