/**
 * Cache Utility Functions
 * Helper functions for KV caching
 */

import { Env, CacheOptions } from '../types/env';

/**
 * Get from cache with automatic JSON parsing
 */
export async function getCached<T>(
  env: Env,
  key: string
): Promise<T | null> {
  if (env.FEATURE_CACHING_ENABLED !== 'true') {
    return null;
  }

  try {
    const cached = await env.CACHE.get(key, 'json');
    return cached as T | null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cache with automatic JSON serialization
 */
export async function setCache<T>(
  env: Env,
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  if (env.FEATURE_CACHING_ENABLED !== 'true') {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    await env.CACHE.put(key, serialized, {
      expirationTtl: options?.ttl || 3600,
    });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete from cache
 */
export async function deleteCache(
  env: Env,
  key: string
): Promise<void> {
  try {
    await env.CACHE.delete(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Cache wrapper for functions
 */
export async function withCache<T>(
  env: Env,
  key: string,
  fn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(env, key);
  if (cached !== null) {
    return cached;
  }

  // Execute function
  const result = await fn();

  // Cache the result
  await setCache(env, key, result, options);

  return result;
}

/**
 * Generate cache key from request
 */
export function generateCacheKey(request: Request, prefix: string = ''): string {
  const url = new URL(request.url);
  return `${prefix}${url.pathname}${url.search}`;
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCachePattern(
  env: Env,
  pattern: string
): Promise<number> {
  let deletedCount = 0;
  let cursor: string | undefined;

  do {
    const result = await env.CACHE.list({ prefix: pattern, cursor });
    
    for (const key of result.keys) {
      await env.CACHE.delete(key.name);
      deletedCount++;
    }

    cursor = result.cursor;
  } while (cursor);

  return deletedCount;
}
