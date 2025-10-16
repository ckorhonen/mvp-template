/**
 * Rate Limiter Utility
 * 
 * Simple rate limiting using Cloudflare KV or Durable Objects
 */

import { KVNamespace } from '@cloudflare/workers-types';
import { RateLimitError } from './errors';

export interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class KVRateLimiter {
  private kv: KVNamespace;
  private config: RateLimitConfig;

  constructor(kv: KVNamespace, config: RateLimitConfig) {
    this.kv = kv;
    this.config = config;
  }

  /**
   * Check if a request should be rate limited
   */
  async checkLimit(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / this.config.windowMs)}`;

    // Get current count
    const countStr = await this.kv.get(windowKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    // Calculate rate limit info
    const reset = Math.ceil(now / this.config.windowMs) * this.config.windowMs;
    const remaining = Math.max(0, this.config.requestsPerWindow - count - 1);

    // Check if limit exceeded
    if (count >= this.config.requestsPerWindow) {
      throw new RateLimitError(
        'Rate limit exceeded',
        Math.ceil((reset - now) / 1000)
      );
    }

    // Increment count
    const ttl = Math.ceil((reset - now) / 1000);
    await this.kv.put(windowKey, (count + 1).toString(), {
      expirationTtl: ttl,
    });

    return {
      limit: this.config.requestsPerWindow,
      remaining,
      reset: Math.floor(reset / 1000),
    };
  }

  /**
   * Get rate limit headers
   */
  getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    return {
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': info.reset.toString(),
    };
  }
}

/**
 * Simple in-memory rate limiter (use for testing or low-volume scenarios)
 */
export class MemoryRateLimiter {
  private requests: Map<string, number[]>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.requests = new Map();
    this.config = config;
  }

  async checkLimit(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get request timestamps for this key
    let timestamps = this.requests.get(key) || [];

    // Filter out old timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.config.requestsPerWindow) {
      const oldestTimestamp = Math.min(...timestamps);
      const resetMs = oldestTimestamp + this.config.windowMs;
      throw new RateLimitError(
        'Rate limit exceeded',
        Math.ceil((resetMs - now) / 1000)
      );
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);

    // Calculate reset time
    const resetMs = timestamps[0] + this.config.windowMs;

    return {
      limit: this.config.requestsPerWindow,
      remaining: this.config.requestsPerWindow - timestamps.length,
      reset: Math.floor(resetMs / 1000),
    };
  }

  getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    return {
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': info.reset.toString(),
    };
  }
}
