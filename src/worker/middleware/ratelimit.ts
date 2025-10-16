import { Middleware, WorkerError } from '../types';

/**
 * Rate limiting middleware using KV
 */
export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // KV key prefix
  keyGenerator?: (request: Request) => string; // Custom key generator
}

export function rateLimitMiddleware(
  options: RateLimitOptions
): Middleware {
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'ratelimit:',
    keyGenerator = (request) => {
      // Default: use client IP
      return request.headers.get('CF-Connecting-IP') || 'unknown';
    },
  } = options;

  return async (request, env, ctx, next) => {
    const identifier = keyGenerator(request);
    const key = `${keyPrefix}${identifier}`;

    // Get current count from KV
    const current = await env.MY_KV.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= maxRequests) {
      const ttl = await env.MY_KV.getWithMetadata(key);
      const resetTime = ttl.metadata?.resetTime as number || Date.now() + windowMs;
      
      throw new WorkerError(
        'Rate limit exceeded',
        429,
        'RATE_LIMIT_EXCEEDED',
        {
          limit: maxRequests,
          resetTime: new Date(resetTime).toISOString(),
        }
      );
    }

    // Increment counter
    const newCount = count + 1;
    const resetTime = Date.now() + windowMs;
    
    await env.MY_KV.put(
      key,
      newCount.toString(),
      {
        expirationTtl: Math.ceil(windowMs / 1000),
        metadata: { resetTime },
      }
    );

    // Add rate limit headers to response
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', maxRequests.toString());
    headers.set('X-RateLimit-Remaining', (maxRequests - newCount).toString());
    headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
