/**
 * Cache Utility Functions
 * Helper functions for KV caching patterns
 */

import { Env } from '../types';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: 'CACHE' | 'SESSIONS' | 'CONFIG';
}

export class CacheManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(
    key: string,
    options?: CacheOptions
  ): Promise<T | null> {
    const namespace = this.getNamespace(options?.namespace);
    const value = await namespace.get(key, { type: 'json' });
    return value as T | null;
  }

  /**
   * Set a value in cache
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const namespace = this.getNamespace(options?.namespace);
    const kvOptions: KVNamespacePutOptions = {};

    if (options?.ttl) {
      kvOptions.expirationTtl = options.ttl;
    }

    await namespace.put(key, JSON.stringify(value), kvOptions);
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    const namespace = this.getNamespace(options?.namespace);
    await namespace.delete(key);
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await factory();

    // Cache the value
    await this.set(key, value, options);

    return value;
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const value = await this.get(key, options);
    return value !== null;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount = 1, options?: CacheOptions): Promise<number> {
    const current = (await this.get<number>(key, options)) || 0;
    const newValue = current + amount;
    await this.set(key, newValue, options);
    return newValue;
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, amount = 1, options?: CacheOptions): Promise<number> {
    return this.increment(key, -amount, options);
  }

  /**
   * Get multiple values at once
   */
  async getMany<T = unknown>(
    keys: string[],
    options?: CacheOptions
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key, options);
        results.set(key, value);
      })
    );

    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMany<T = unknown>(
    entries: Map<string, T>,
    options?: CacheOptions
  ): Promise<void> {
    await Promise.all(
      Array.from(entries.entries()).map(([key, value]) =>
        this.set(key, value, options)
      )
    );
  }

  /**
   * List keys with optional prefix
   */
  async listKeys(
    prefix = '',
    limit = 100,
    options?: CacheOptions
  ): Promise<{ keys: string[]; hasMore: boolean; cursor?: string }> {
    const namespace = this.getNamespace(options?.namespace);
    const result = await namespace.list({ prefix, limit });

    return {
      keys: result.keys.map((k) => k.name),
      hasMore: !result.list_complete,
      cursor: result.cursor,
    };
  }

  /**
   * Clear all keys with a prefix
   */
  async clearPrefix(prefix: string, options?: CacheOptions): Promise<number> {
    const namespace = this.getNamespace(options?.namespace);
    let deleted = 0;
    let cursor: string | undefined;

    do {
      const result = await namespace.list({ prefix, limit: 1000, cursor });

      await Promise.all(
        result.keys.map(async (key) => {
          await namespace.delete(key.name);
          deleted++;
        })
      );

      cursor = result.cursor;
    } while (cursor);

    return deleted;
  }

  /**
   * Get the appropriate KV namespace
   */
  private getNamespace(namespace?: 'CACHE' | 'SESSIONS' | 'CONFIG'): KVNamespace {
    switch (namespace) {
      case 'SESSIONS':
        return this.env.SESSIONS;
      case 'CONFIG':
        return this.env.CONFIG;
      case 'CACHE':
      default:
        return this.env.CACHE;
    }
  }
}

/**
 * Factory function to create cache manager
 */
export function createCacheManager(env: Env): CacheManager {
  return new CacheManager(env);
}

/**
 * Generate a cache key from components
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Parse a cache key into components
 */
export function parseCacheKey(key: string): string[] {
  return key.split(':');
}
