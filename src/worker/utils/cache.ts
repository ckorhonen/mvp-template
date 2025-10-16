import type { Env } from '../types/env';
import { createLogger } from './logger';

const logger = createLogger('Cache');

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: 'CACHE' | 'SESSIONS';
}

/**
 * KV cache helper
 */
export class CacheHelper {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get value from cache
   */
  async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      const namespace = this.getNamespace(options.namespace);
      const value = await namespace.get(key, 'text');

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get failed', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const namespace = this.getNamespace(options.namespace);
      const serialized = JSON.stringify(value);

      const putOptions: KVNamespacePutOptions = {};
      if (options.ttl) {
        putOptions.expirationTtl = options.ttl;
      }

      await namespace.put(key, serialized, putOptions);
    } catch (error) {
      logger.error('Cache set failed', { key, error });
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(
    key: string,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const namespace = this.getNamespace(options.namespace);
      await namespace.delete(key);
    } catch (error) {
      logger.error('Cache delete failed', { key, error });
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(
    key: string,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const value = await this.get(key, options);
    return value !== null;
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * List keys with prefix
   */
  async listKeys(
    prefix: string,
    options: CacheOptions = {}
  ): Promise<string[]> {
    try {
      const namespace = this.getNamespace(options.namespace);
      const list = await namespace.list({ prefix });
      return list.keys.map((k) => k.name);
    } catch (error) {
      logger.error('Cache list failed', { prefix, error });
      return [];
    }
  }

  /**
   * Clear all keys with prefix
   */
  async clearPrefix(
    prefix: string,
    options: CacheOptions = {}
  ): Promise<number> {
    try {
      const keys = await this.listKeys(prefix, options);
      await Promise.all(keys.map((key) => this.delete(key, options)));
      return keys.length;
    } catch (error) {
      logger.error('Cache clear failed', { prefix, error });
      return 0;
    }
  }

  /**
   * Get the appropriate KV namespace
   */
  private getNamespace(namespace?: 'CACHE' | 'SESSIONS'): KVNamespace {
    return namespace === 'SESSIONS' ? this.env.SESSIONS : this.env.CACHE;
  }
}

/**
 * Generate cache key with prefix
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}
