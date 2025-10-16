/**
 * Common Cloudflare Workers Utility Functions
 */

import type { Env } from '../types';

/**
 * JSON Response Helper
 */
export function jsonResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

/**
 * Error Response Helper
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): Response {
  return jsonResponse(
    {
      error: message,
      status,
      ...(details && { details }),
    },
    status
  );
}

/**
 * CORS Preflight Handler
 */
export function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Parse JSON body with error handling
 */
export async function parseJSON<T = any>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Generate a random ID
 */
export function generateId(length: number = 16): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Cache response with KV
 */
export async function cacheWithKV(
  kv: KVNamespace,
  key: string,
  getData: () => Promise<any>,
  ttl: number = 3600
): Promise<any> {
  // Try to get from cache
  const cached = await kv.get(key, 'json');
  if (cached) {
    return cached;
  }

  // Get fresh data
  const data = await getData();

  // Store in cache
  await kv.put(key, JSON.stringify(data), {
    expirationTtl: ttl,
  });

  return data;
}

/**
 * Rate limiting with KV
 */
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 3600
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  const current = await kv.get(key, 'json');

  if (!current) {
    await kv.put(
      key,
      JSON.stringify({ count: 1, resetAt }),
      { expirationTtl: windowSeconds }
    );
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  const count = (current as any).count || 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0, resetAt: (current as any).resetAt };
  }

  await kv.put(
    key,
    JSON.stringify({ count: count + 1, resetAt }),
    { expirationTtl: windowSeconds }
  );

  return { allowed: true, remaining: limit - count - 1, resetAt };
}

/**
 * Store file in R2 bucket
 */
export async function storeInR2(
  bucket: R2Bucket,
  key: string,
  data: string | ArrayBuffer | ReadableStream,
  metadata?: Record<string, string>
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: metadata,
  });
}

/**
 * Retrieve file from R2 bucket
 */
export async function retrieveFromR2(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(key);
}

/**
 * Delete file from R2 bucket
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hash string using Web Crypto API
 */
export async function hashString(
  str: string,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Truncate string to specified length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse query parameters from URL
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
 * Format date to ISO string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(request: Request, env: Env): boolean {
  const token = extractBearerToken(request);
  if (!token) return false;
  
  // Implement your authentication logic here
  // For example, check against env.API_KEY or validate JWT
  return token === env.API_KEY;
}

/**
 * Log request with structured data
 */
export function logRequest(
  request: Request,
  additionalData?: Record<string, any>
): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
      ...additionalData,
    })
  );
}
