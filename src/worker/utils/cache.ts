/**
 * Cache Utilities
 * 
 * Helpers for working with KV cache, including TTL management and key generation.
 */

import type { Env } from '../types';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  metadata?: Record<string, unknown>;
}

export class CacheManager {
  constructor(private kv: KVNamespace, private keyPrefix: string = 'cache:') {}

  /**
   * Generate a cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(this.getKey(key), 'json');
    return value as T | null;
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    const { ttl = 3600, metadata } = options;
    await this.kv.put(
      this.getKey(key),
      JSON.stringify(value),
      {
        expirationTtl: ttl,
        metadata: metadata || {},
      }
    );
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    await this.kv.delete(this.getKey(key));
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.kv.get(this.getKey(key));
    return value !== null;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate cache by pattern (list and delete)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.kv.list({ prefix: this.getKey(pattern) });
    let deleted = 0;
    
    for (const key of keys.keys) {
      await this.kv.delete(key.name);
      deleted++;
    }
    
    return deleted;
  }
}

/**
 * Create a cache manager from environment
 */
export function createCacheManager(env: Env): CacheManager {
  return new CacheManager(env.CACHE);
}

/**
 * Generate a cache key from request
 */
export function getCacheKeyFromRequest(request: Request): string {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname + url.search;
  return `req:${method}:${path}`;
}

/**
 * Check if response is cacheable
 */
export function isCacheable(response: Response): boolean {
  // Only cache successful GET requests
  if (response.status !== 200) return false;
  
  // Check cache-control header
  const cacheControl = response.headers.get('cache-control');
  if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
    return false;
  }
  
  return true;
}
