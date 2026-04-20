/**
 * Rate Limiting Middleware
 * Prevent abuse with configurable rate limits
 */

import { Env } from '../types/env';
import { errorResponse } from '../utils/response';

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: Request): string {
  // Try to get IP from CF headers
  const cfConnectingIp = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIp) return cfConnectingIp;

  // Fallback to X-Forwarded-For
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

  // Fallback to a default
  return 'unknown';
}

/**
 * Rate limiting middleware using KV
 */
export async function rateLimitMiddleware(
  request: Request,
  env: Env
): Promise<Response | null> {
  // Check if rate limiting is enabled
  if (env.FEATURE_RATE_LIMITING_ENABLED !== 'true') {
    return null;
  }

  const clientId = getClientIdentifier(request);
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${clientId}:${currentMinute}`;

  try {
    // Get current count from KV
    const countStr = await env.CACHE.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    const limit = parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60', 10);

    if (count >= limit) {
      return errorResponse('Rate limit exceeded. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED', {
        limit,
        window: '1 minute',
        retryAfter: 60,
      });
    }

    // Increment counter
    await env.CACHE.put(key, (count + 1).toString(), {
      expirationTtl: 120, // 2 minutes to be safe
    });

    return null;
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error('Rate limiting error:', error);
    return null;
  }
}

/**
 * Get rate limit info for a client
 */
export async function getRateLimitInfo(
  clientId: string,
  env: Env
): Promise<{ count: number; limit: number; remaining: number; resetAt: Date }> {
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${clientId}:${currentMinute}`;

  const countStr = await env.CACHE.get(key);
  const count = countStr ? parseInt(countStr, 10) : 0;
  const limit = parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60', 10);

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date((currentMinute + 1) * 60000),
  };
}
