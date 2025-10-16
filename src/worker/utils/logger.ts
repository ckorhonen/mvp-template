/**
 * Logger Utility
 * Structured logging for Cloudflare Workers
 */

import { Env } from '../types/env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

export class Logger {
  private minLevel: LogLevel;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.minLevel = LOG_LEVEL_MAP[env.LOG_LEVEL?.toLowerCase()] || LogLevel.INFO;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.minLevel) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      environment: this.env.ENVIRONMENT,
      message,
      data,
    };

    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, {
      error: error?.message,
      stack: error?.stack,
      ...error,
    });
  }
}
