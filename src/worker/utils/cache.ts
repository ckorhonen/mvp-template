// ===========================================
// Cache Utilities
// KV-based caching with TTL and tags
// ===========================================

import type { KVNamespace } from '@cloudflare/workers-types';
import type { Env, CacheOptions, CacheEntry } from '../types';
import { getLogger } from './logger';

const logger = getLogger('Cache');

/**
 * Cache Client
 * Provides caching functionality with TTL and tag-based invalidation
 */
export class CacheClient {
  constructor(
    private kv: KVNamespace,
    private defaultTtl: number = 3600 // 1 hour default
  ) {}

  /**
   * Get a cached value
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'json');
      
      if (!value) {
        return null;
      }

      const entry = value as CacheEntry<T>;

      // Check if expired (additional safety check)
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await this.delete(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      logger.error('Cache get failed', { key, error });
      return null; // Fail gracefully
    }
  }

  /**
   * Set a cached value
   */
  async set<T = any>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTtl;
      const expiresAt = Date.now() + ttl * 1000;

      const entry: CacheEntry<T> = {
        value,
        expiresAt,
        tags: options.tags,
      };

      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttl,
        metadata: { tags: options.tags || [] },
      });

      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Cache set failed', { key, error });
      // Fail gracefully - don't throw
    }
  }

  /**
   * Delete a cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      logger.debug('Cache deleted', { key });
    } catch (error) {
      logger.error('Cache delete failed', { key, error });
    }
  }

  /**
   * Get or set a cached value
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    logger.debug('Cache miss', { key });
    const value = await factory();
    await this.set(key, value, options);

    return value;
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      // List all keys (this is expensive - use sparingly)
      const list = await this.kv.list();
      let count = 0;

      for (const key of list.keys) {
        if (key.metadata && Array.isArray((key.metadata as any).tags)) {
          const tags = (key.metadata as any).tags as string[];
          if (tags.includes(tag)) {
            await this.delete(key.name);
            count++;
          }
        }
      }

      logger.info('Cache invalidated by tag', { tag, count });
      return count;
    } catch (error) {
      logger.error('Cache invalidation failed', { tag, error });
      return 0;
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clear(): Promise<void> {
    try {
      const list = await this.kv.list();
      
      for (const key of list.keys) {
        await this.delete(key.name);
      }

      logger.warn('Cache cleared');
    } catch (error) {
      logger.error('Cache clear failed', { error });
    }
  }
}

/**
 * Create a cache client
 */
export function createCacheClient(env: Env): CacheClient {
  return new CacheClient(env.CACHE);
}

/**
 * Generate a cache key
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Cache decorator for methods
 */
export function cached(options: CacheOptions & { keyPrefix: string }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const cache = this.cache as CacheClient;
      
      if (!cache) {
        return originalMethod.apply(this, args);
      }

      const key = cacheKey(options.keyPrefix, propertyKey, ...args);
      
      return cache.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}
