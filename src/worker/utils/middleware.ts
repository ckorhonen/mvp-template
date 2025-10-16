/**
 * Middleware utilities for Cloudflare Workers
 */

import { Env, RequestContext, AppError } from '../types';
import { Database } from './database';
import { createLogger } from './logger';

export type Middleware = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext
) => Promise<void>;

/**
 * Authentication middleware
 * Validates bearer token and adds userId to context
 */
export async function authMiddleware(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext
): Promise<void> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      'UNAUTHORIZED',
      'Missing or invalid authorization header',
      401
    );
  }

  const token = authHeader.substring(7);
  const logger = createLogger(env, context.requestId);
  const db = new Database(env, logger);

  const session = await db.getSession(token);
  
  if (!session) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }

  context.userId = session.user_id;
  logger.debug('User authenticated', { userId: session.user_id });
}

/**
 * Rate limiting middleware using Durable Objects
 */
export async function rateLimitMiddleware(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext,
  options: { limit: number; window: number } = { limit: 100, window: 60 }
): Promise<void> {
  if (!env.RATE_LIMITER) {
    // Rate limiter not configured, skip
    return;
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const id = env.RATE_LIMITER.idFromName(ip);
  const limiter = env.RATE_LIMITER.get(id);

  const response = await limiter.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify(options),
  });

  if (response.status === 429) {
    throw new AppError(
      'RATE_LIMIT_EXCEEDED',
      'Rate limit exceeded',
      429,
      { limit: options.limit, window: options.window }
    );
  }
}

/**
 * Request validation middleware
 */
export async function validateJsonBody(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext
): Promise<void> {
  const contentType = request.headers.get('Content-Type');
  
  if (!contentType || !contentType.includes('application/json')) {
    throw new AppError(
      'INVALID_CONTENT_TYPE',
      'Content-Type must be application/json',
      400
    );
  }

  try {
    const body = await request.clone().json();
    if (typeof body !== 'object' || body === null) {
      throw new Error('Body must be a JSON object');
    }
  } catch (error) {
    throw new AppError(
      'INVALID_JSON',
      'Request body must be valid JSON',
      400,
      { error: (error as Error).message }
    );
  }
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(...middlewares: Middleware[]): Middleware {
  return async (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    context: RequestContext
  ) => {
    for (const middleware of middlewares) {
      await middleware(request, env, ctx, context);
    }
  };
}
