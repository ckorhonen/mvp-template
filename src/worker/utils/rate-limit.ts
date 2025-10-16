/**
 * Rate Limiting Utilities
 * 
 * Implements token bucket algorithm for rate limiting using KV or Durable Objects.
 */

import type { Env } from '../types';

export interface RateLimitConfig {
  limit: number; // Max requests
  window: number; // Time window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp when limit resets
}

export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig
  ) {}

  /**
   * Get rate limit key for an identifier
   */
  private getKey(identifier: string): string {
    const window = Math.floor(Date.now() / 1000 / this.config.window);
    return `ratelimit:${identifier}:${window}`;
  }

  /**
   * Check and increment rate limit
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = this.getKey(identifier);
    const window = Math.floor(Date.now() / 1000 / this.config.window);
    const reset = (window + 1) * this.config.window;

    // Get current count
    const currentCount = await this.kv.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= this.config.limit) {
      return {
        allowed: false,
        limit: this.config.limit,
        remaining: 0,
        reset,
      };
    }

    // Increment count
    const newCount = count + 1;
    await this.kv.put(key, newCount.toString(), {
      expirationTtl: this.config.window * 2, // Keep for 2 windows
    });

    return {
      allowed: true,
      limit: this.config.limit,
      remaining: this.config.limit - newCount,
      reset,
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(identifier: string): Promise<RateLimitResult> {
    const key = this.getKey(identifier);
    const window = Math.floor(Date.now() / 1000 / this.config.window);
    const reset = (window + 1) * this.config.window;

    const currentCount = await this.kv.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    return {
      allowed: count < this.config.limit,
      limit: this.config.limit,
      remaining: Math.max(0, this.config.limit - count),
      reset,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    await this.kv.delete(key);
  }
}

/**
 * Create a rate limiter from environment
 */
export function createRateLimiter(
  env: Env,
  config?: RateLimitConfig
): RateLimiter {
  const defaultConfig: RateLimitConfig = {
    limit: parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60', 10),
    window: 60, // 1 minute
  };
  
  return new RateLimiter(env.CACHE, config || defaultConfig);
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get from CF-Connecting-IP header
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) return ip;
  
  // Fall back to X-Forwarded-For
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Default fallback
  return 'unknown';
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
