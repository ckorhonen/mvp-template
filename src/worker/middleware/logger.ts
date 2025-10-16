/**
 * Logging middleware
 */

import type { Context, Middleware } from '../types';

export interface LogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

/**
 * Logger middleware
 */
export function logger(): Middleware {
  return async (ctx: Context, next) => {
    const startTime = Date.now();
    
    try {
      const response = await next();
      
      const duration = Date.now() - startTime;
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
        method: ctx.request.method,
        url: ctx.request.url,
        status: response.status,
        duration,
        userAgent: ctx.request.headers.get('User-Agent') || undefined,
        ip: ctx.request.headers.get('CF-Connecting-IP') || undefined,
        userId: ctx.user?.id,
      };

      // Log based on environment
      if (ctx.env.LOG_LEVEL === 'debug' || ctx.env.ENVIRONMENT === 'development') {
        console.log(JSON.stringify(logEntry, null, 2));
      } else {
        console.log(JSON.stringify(logEntry));
      }

      // Optionally write to Analytics Engine
      if (ctx.env.ANALYTICS) {
        ctx.env.ANALYTICS.writeDataPoint({
          indexes: [ctx.request.method, response.status.toString()],
          doubles: [duration],
          blobs: [ctx.request.url],
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
        method: ctx.request.method,
        url: ctx.request.url,
        status: 500,
        duration,
        userAgent: ctx.request.headers.get('User-Agent') || undefined,
        ip: ctx.request.headers.get('CF-Connecting-IP') || undefined,
        userId: ctx.user?.id,
      };

      console.error(JSON.stringify(logEntry), error);
      throw error;
    }
  };
}
