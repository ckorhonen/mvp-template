/**
 * Logger Middleware
 * Log all incoming requests
 */

import { Env } from '../types/env';
import { Logger } from '../utils/logger';

/**
 * Logger middleware - logs all incoming requests
 */
export function loggerMiddleware(request: Request, env: Env): void {
  const logger = new Logger(env);
  const url = new URL(request.url);

  logger.info('Incoming request', {
    method: request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers.entries()),
  });
}
