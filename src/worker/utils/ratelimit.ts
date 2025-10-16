/**
 * Rate limiting utility using KV namespace
 */

import { KVNamespace } from '@cloudflare/workers-types';
import { RateLimitConfig } from '../types';

/**
 * Rate limiter class using sliding window algorithm
 */
export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig
  ) {}

  /**
   * Check if a request should be rate limited
   * @returns {exceeded: boolean, remaining: number, resetAt: number}
   */
  async checkLimit(identifier: string): Promise<{
    exceeded: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
  }> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current request count
      const data = await this.kv.get(key, 'json') as {
        count: number;
        resetAt: number;
      } | null;

      let count = 0;
      let resetAt = now + this.config.windowMs;

      if (data) {
        // If window hasn't expired, use existing count
        if (data.resetAt > now) {
          count = data.count;
          resetAt = data.resetAt;
        }
      }

      // Check if limit exceeded
      if (count >= this.config.maxRequests) {
        return {
          exceeded: true,
          remaining: 0,
          resetAt,
          limit: this.config.maxRequests,
        };
      }

      // Increment counter
      const newCount = count + 1;
      await this.kv.put(
        key,
        JSON.stringify({ count: newCount, resetAt }),
        { expirationTtl: Math.ceil(this.config.windowMs / 1000) }
      );

      return {
        exceeded: false,
        remaining: this.config.maxRequests - newCount,
        resetAt,
        limit: this.config.maxRequests,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open)
      return {
        exceeded: false,
        remaining: this.config.maxRequests,
        resetAt: now + this.config.windowMs,
        limit: this.config.maxRequests,
      };
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    await this.kv.delete(key);
  }
}

/**
 * Create rate limiter instance
 */
export function createRateLimiter(
  kv: KVNamespace,
  maxRequests: number = 100,
  windowMs: number = 60000, // 1 minute
  keyPrefix: string = 'ratelimit'
): RateLimiter {
  return new RateLimiter(kv, { maxRequests, windowMs, keyPrefix });
}

/**
 * Get identifier from request (IP address or custom header)
 */
export function getRequestIdentifier(request: Request): string {
  // Try to get from X-Forwarded-For header
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Try to get from CF-Connecting-IP header (Cloudflare)
  const cfConnectingIp = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: {
    remaining: number;
    resetAt: number;
    limit: number;
  }
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());
}
