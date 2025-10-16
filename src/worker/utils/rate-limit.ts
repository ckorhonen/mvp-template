/**
 * Rate limiting utilities using KV storage
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { RateLimitError } from './errors';

interface RateLimitConfig {
  requests: number;
  windowSeconds: number;
}

interface RateLimitData {
  count: number;
  resetAt: number;
}

/**
 * Simple rate limiter using KV
 */
export class RateLimiter {
  constructor(private kv: KVNamespace) {}

  /**
   * Check if request is within rate limit
   */
  async check(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const kvKey = `ratelimit:${key}`;

    // Get current rate limit data
    const dataStr = await this.kv.get(kvKey);
    let data: RateLimitData;

    if (!dataStr) {
      // First request
      data = {
        count: 1,
        resetAt: now + config.windowSeconds * 1000,
      };
    } else {
      data = JSON.parse(dataStr);

      // Check if window has expired
      if (now >= data.resetAt) {
        // Reset window
        data = {
          count: 1,
          resetAt: now + config.windowSeconds * 1000,
        };
      } else {
        // Increment counter
        data.count++;
      }
    }

    // Store updated data
    await this.kv.put(kvKey, JSON.stringify(data), {
      expirationTtl: config.windowSeconds,
    });

    const allowed = data.count <= config.requests;
    const remaining = Math.max(0, config.requests - data.count);

    return {
      allowed,
      remaining,
      resetAt: data.resetAt,
    };
  }

  /**
   * Enforce rate limit, throw error if exceeded
   */
  async enforce(key: string, config: RateLimitConfig): Promise<void> {
    const result = await this.check(key, config);

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again after ${new Date(result.resetAt).toISOString()}`
      );
    }
  }
}

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(request: Request, prefix: string = 'global'): string {
  // Try to get IP address from CF-Connecting-IP header
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return `${prefix}:${ip}`;
}

/**
 * Common rate limit configurations
 */
export const rateLimitConfigs = {
  // 60 requests per minute
  perMinute: { requests: 60, windowSeconds: 60 },
  
  // 1000 requests per hour
  perHour: { requests: 1000, windowSeconds: 3600 },
  
  // 10000 requests per day
  perDay: { requests: 10000, windowSeconds: 86400 },
  
  // Strict limit for expensive operations
  strict: { requests: 10, windowSeconds: 60 },
};
