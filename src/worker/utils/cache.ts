/**
 * KV Cache utility functions for Cloudflare Workers
 */

import { KVNamespace } from '@cloudflare/workers-types';
import { CacheConfig } from '../types';

/**
 * Cache wrapper for KV namespace
 */
export class KVCache {
  constructor(private kv: KVNamespace) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'text');
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl,
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await factory();

    // Store in cache (don't await to avoid blocking)
    this.set(key, value, ttl).catch(err => 
      console.error('Background cache set failed:', err)
    );

    return value;
  }

  /**
   * List keys with a prefix
   */
  async listKeys(prefix: string, limit: number = 100): Promise<string[]> {
    try {
      const list = await this.kv.list({ prefix, limit });
      return list.keys.map(k => k.name);
    } catch (error) {
      console.error('Cache list error:', error);
      return [];
    }
  }

  /**
   * Bulk delete keys with a prefix
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      const keys = await this.listKeys(prefix, 1000);
      await Promise.all(keys.map(key => this.delete(key)));
      return keys.length;
    } catch (error) {
      console.error('Cache bulk delete error:', error);
      return 0;
    }
  }
}

/**
 * Generate cache key with namespace
 */
export function generateCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Cache-aside pattern helper
 */
export async function cacheAside<T>(
  kv: KVNamespace,
  config: CacheConfig,
  factory: () => Promise<T>
): Promise<T> {
  const cache = new KVCache(kv);
  return cache.getOrSet(config.key, factory, config.ttl);
}
