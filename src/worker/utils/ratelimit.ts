/**
 * Rate limiting utilities
 */

import { RateLimitError } from './errors';

export interface RateLimitConfig {
  requests: number; // Number of requests allowed
  window: number; // Time window in seconds
}

/**
 * Simple token bucket rate limiter using KV
 */
export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig
  ) {}

  /**
   * Check if request is allowed for a given identifier
   */
  async isAllowed(identifier: string): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.window * 1000;

    // Get current state
    const state = await this.kv.get<{
      count: number;
      resetAt: number;
    }>(key, 'json');

    if (!state || state.resetAt < now) {
      // New window or expired
      await this.kv.put(
        key,
        JSON.stringify({
          count: 1,
          resetAt: now + this.config.window * 1000,
        }),
        {
          expirationTtl: this.config.window,
        }
      );
      return true;
    }

    if (state.count >= this.config.requests) {
      return false;
    }

    // Increment counter
    await this.kv.put(
      key,
      JSON.stringify({
        count: state.count + 1,
        resetAt: state.resetAt,
      }),
      {
        expirationTtl: Math.ceil((state.resetAt - now) / 1000),
      }
    );

    return true;
  }

  /**
   * Get rate limit info
   */
  async getInfo(identifier: string): Promise<{
    limit: number;
    remaining: number;
    resetAt: number;
  }> {
    const key = `ratelimit:${identifier}`;
    const state = await this.kv.get<{
      count: number;
      resetAt: number;
    }>(key, 'json');

    if (!state || state.resetAt < Date.now()) {
      return {
        limit: this.config.requests,
        remaining: this.config.requests,
        resetAt: Date.now() + this.config.window * 1000,
      };
    }

    return {
      limit: this.config.requests,
      remaining: Math.max(0, this.config.requests - state.count),
      resetAt: state.resetAt,
    };
  }
}

/**
 * Rate limit middleware
 */
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const limiter = new RateLimiter(kv, config);
  const allowed = await limiter.isAllowed(identifier);

  if (!allowed) {
    const info = await limiter.getInfo(identifier);
    throw new RateLimitError(
      `Rate limit exceeded. Try again after ${new Date(info.resetAt).toISOString()}`
    );
  }
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: Request): string {
  // Try to get from headers first
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) return apiKey;

  // Fall back to IP (from CF-Connecting-IP header)
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) return ip;

  // Last resort: use a hash of the request
  return 'anonymous';
}
