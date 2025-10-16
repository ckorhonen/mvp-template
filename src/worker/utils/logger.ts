// ===========================================
// Logger Utility
// Structured logging for Cloudflare Workers
// ===========================================

import type { LogLevel, LogEntry } from '../types';
import { LogLevel as Level } from '../types';

/**
 * Logger Class
 * Provides structured logging with different levels
 */
export class Logger {
  private minLevel: LogLevel;
  private context: string;

  constructor(context: string, minLevel: LogLevel = Level.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    const logMessage = {
      ...entry,
      context: this.context,
      level: Level[level],
    };

    // Output to console based on level
    switch (level) {
      case Level.DEBUG:
        console.debug(JSON.stringify(logMessage));
        break;
      case Level.INFO:
        console.info(JSON.stringify(logMessage));
        break;
      case Level.WARN:
        console.warn(JSON.stringify(logMessage));
        break;
      case Level.ERROR:
        console.error(JSON.stringify(logMessage));
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log(Level.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(Level.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(Level.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(Level.ERROR, message, data);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * Get a logger instance
 */
export function getLogger(context: string, logLevelStr?: string): Logger {
  const logLevel = parseLogLevel(logLevelStr || 'info');
  return new Logger(context, logLevel);
}

/**
 * Parse log level from string
 */
function parseLogLevel(level: string): LogLevel {
  const levelMap: Record<string, LogLevel> = {
    debug: Level.DEBUG,
    info: Level.INFO,
    warn: Level.WARN,
    error: Level.ERROR,
  };

  return levelMap[level.toLowerCase()] || Level.INFO;
}
