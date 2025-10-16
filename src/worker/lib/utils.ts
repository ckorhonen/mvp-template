/**
 * Common utility functions for Cloudflare Workers
 */

import { Env } from '../types';

/**
 * JSON response helper with proper headers
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown,
): Response {
  return jsonResponse(
    {
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    status,
  );
}

/**
 * CORS headers helper
 */
export function corsHeaders(origin = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCORS(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  return null;
}

/**
 * Parse request body with error handling
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Validate required environment variables
 */
export function validateEnv(env: Env, required: (keyof Env)[]): void {
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

/**
 * Rate limiting using Durable Objects or KV
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number,
  kv: KVNamespace,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  const data = await kv.get(key, 'json');
  const requests: number[] = (data as number[]) || [];

  // Filter requests within the time window
  const recentRequests = requests.filter((timestamp) => now - timestamp < window);

  if (recentRequests.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Add current request
  recentRequests.push(now);
  await kv.put(key, JSON.stringify(recentRequests), {
    expirationTtl: Math.ceil(window / 1000),
  });

  return {
    allowed: true,
    remaining: limit - recentRequests.length,
  };
}

/**
 * Cache response helper
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  cacheTtl: number,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  // Clone response before caching
  const responseToCache = response.clone();

  // Add cache headers
  const headers = new Headers(responseToCache.headers);
  headers.set('Cache-Control', `public, max-age=${cacheTtl}`);

  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers,
  });

  // Store in cache
  await cache.put(cacheKey, cachedResponse);

  return response;
}

/**
 * Get cached response
 */
export async function getCachedResponse(
  request: Request,
): Promise<Response | undefined> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  return await cache.match(cacheKey);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * Parse URL query parameters
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Validate request method
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[],
): void {
  if (!allowedMethods.includes(request.method)) {
    throw new Error(
      `Method ${request.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    );
  }
}
