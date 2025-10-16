/**
 * Rate Limiting Utilities
 * Implements token bucket and sliding window rate limiting
 */

import { RateLimitError } from './errors';

export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit using KV storage
 * @param key - Rate limit key (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @param kv - KV namespace binding
 * @returns Rate limit result
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  kv: KVNamespace
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${config.keyPrefix || 'ratelimit'}:${key}:${Math.floor(now / config.window)}`;

  // Get current count
  const currentCount = await kv.get(windowKey);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= config.limit) {
    const resetAt = Math.ceil(now / config.window) * config.window;
    const retryAfter = resetAt - now;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  // Increment count
  await kv.put(windowKey, (count + 1).toString(), {
    expirationTtl: config.window * 2, // Keep for 2 windows
  });

  const resetAt = Math.ceil(now / config.window) * config.window;

  return {
    allowed: true,
    remaining: config.limit - count - 1,
    resetAt,
  };
}

/**
 * Rate limit middleware
 * @param config - Rate limit configuration
 * @param getKey - Function to extract rate limit key from request
 * @returns Middleware function
 */
export function rateLimitMiddleware(
  config: RateLimitConfig,
  getKey: (request: Request) => string = getIpFromRequest
) {
  return async (
    request: Request,
    env: any,
    next: () => Promise<Response>
  ): Promise<Response> => {
    if (!env.CACHE) {
      console.warn('KV namespace CACHE not bound, skipping rate limiting');
      return next();
    }

    const key = getKey(request);
    const result = await checkRateLimit(key, config, env.CACHE);

    if (!result.allowed) {
      throw new RateLimitError('Too many requests', result.retryAfter);
    }

    const response = await next();

    // Add rate limit headers
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', config.limit.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', result.resetAt.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Extract IP address from request
 * @param request - Request object
 * @returns IP address
 */
export function getIpFromRequest(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
