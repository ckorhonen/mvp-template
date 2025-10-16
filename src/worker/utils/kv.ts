/**
 * KV storage utilities with caching strategies
 * Provides type-safe KV operations with TTL and namespace management
 */

import { Logger } from './logger';

export interface KVOptions {
  /** Time to live in seconds */
  expirationTtl?: number;
  /** Expiration timestamp */
  expiration?: number;
  /** Metadata to store with the value */
  metadata?: unknown;
}

export interface CacheOptions extends KVOptions {
  /** Prefix for cache keys */
  prefix?: string;
}

/**
 * KV Cache Manager
 */
export class KVCache {
  private namespace: KVNamespace;
  private logger?: Logger;
  private prefix: string;

  constructor(
    namespace: KVNamespace,
    options: { prefix?: string; logger?: Logger } = {}
  ) {
    this.namespace = namespace;
    this.prefix = options.prefix || '';
    this.logger = options.logger;
  }

  /**
   * Generate a cache key with optional prefix
   */
  private getCacheKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      const value = await this.namespace.get(cacheKey, 'text');
      
      if (value === null) {
        this.logger?.debug('Cache miss', { key: cacheKey });
        return null;
      }

      this.logger?.debug('Cache hit', { key: cacheKey });
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger?.error('Cache get error', error, { key: cacheKey });
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: KVOptions = {}): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      await this.namespace.put(cacheKey, JSON.stringify(value), options);
      this.logger?.debug('Cache set', { key: cacheKey, ttl: options.expirationTtl });
    } catch (error) {
      this.logger?.error('Cache set error', error, { key: cacheKey });
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      await this.namespace.delete(cacheKey);
      this.logger?.debug('Cache delete', { key: cacheKey });
    } catch (error) {
      this.logger?.error('Cache delete error', error, { key: cacheKey });
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get with fallback function
   * If cache miss, execute fallback, cache the result, and return it
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    options: KVOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await fallback();
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * List keys with optional prefix
   */
  async list(
    options: { prefix?: string; limit?: number; cursor?: string } = {}
  ): Promise<{ keys: KVNamespace.ListKey[]; cursor?: string; list_complete: boolean }> {
    const listOptions: KVNamespace.ListOptions = {
      prefix: options.prefix ? this.getCacheKey(options.prefix) : this.prefix,
      limit: options.limit,
      cursor: options.cursor,
    };

    return this.namespace.list(listOptions);
  }

  /**
   * Get with metadata
   */
  async getWithMetadata<T, M = unknown>(
    key: string
  ): Promise<{ value: T | null; metadata: M | null }> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      const result = await this.namespace.getWithMetadata<M>(cacheKey, 'text');
      
      if (result.value === null) {
        return { value: null, metadata: null };
      }

      return {
        value: JSON.parse(result.value) as T,
        metadata: result.metadata,
      };
    } catch (error) {
      this.logger?.error('Cache getWithMetadata error', error, { key: cacheKey });
      return { value: null, metadata: null };
    }
  }

  /**
   * Batch get multiple keys
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        results.set(key, value);
      })
    );
    
    return results;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async batchSet<T>(
    entries: Array<{ key: string; value: T; options?: KVOptions }>
  ): Promise<void> {
    await Promise.all(
      entries.map((entry) => this.set(entry.key, entry.value, entry.options))
    );
  }
}

/**
 * Create a KV cache instance
 */
export function createKVCache(
  namespace: KVNamespace,
  options: { prefix?: string; logger?: Logger } = {}
): KVCache {
  return new KVCache(namespace, options);
}
