import type { Env } from '../types/env';
import { RateLimitError } from './errors';
import { createLogger } from './logger';

const logger = createLogger('RateLimit');

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requests: number; // Number of requests
  window: number; // Time window in seconds
  identifier?: string; // Optional custom identifier
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Simple token bucket rate limiter using KV
 */
export class RateLimiter {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const cacheKey = `ratelimit:${key}`;
    const now = Date.now();

    try {
      // Get current state from KV
      const stateStr = await this.env.CACHE.get(cacheKey);
      let state = stateStr ? JSON.parse(stateStr) : null;

      if (!state || now > state.resetAt) {
        // Initialize new window
        state = {
          count: 0,
          resetAt: now + config.window * 1000,
        };
      }

      // Increment counter
      state.count += 1;
      const allowed = state.count <= config.requests;
      const remaining = Math.max(0, config.requests - state.count);

      // Save state with TTL
      await this.env.CACHE.put(cacheKey, JSON.stringify(state), {
        expirationTtl: config.window,
      });

      return {
        allowed,
        remaining,
        resetAt: state.resetAt,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { key, error });
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        remaining: config.requests,
        resetAt: now + config.window * 1000,
      };
    }
  }

  /**
   * Enforce rate limit and throw error if exceeded
   */
  async enforce(key: string, config: RateLimitConfig): Promise<void> {
    const result = await this.checkLimit(key, config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new RateLimitError(retryAfter);
    }
  }
}

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(request: Request, identifier?: string): string {
  if (identifier) {
    return identifier;
  }

  // Try to get IP from CF headers
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For')?.split(',')[0] || 
             'unknown';
  
  return ip;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(result.remaining + 1));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.resetAt));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
