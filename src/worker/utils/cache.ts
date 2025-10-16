/**
 * KV Cache Utility Functions
 */

import { Env } from '../types/env';
import { Logger } from './logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: 'CACHE' | 'SESSIONS' | 'CONFIG';
}

export class CacheService {
  private readonly logger: Logger;

  constructor(
    private readonly env: Env
  ) {
    this.logger = new Logger(env);
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const namespace = this.getNamespace(options?.namespace);
      const value = await namespace.get(key, 'text');

      if (!value) {
        this.logger.debug('Cache miss', { key });
        return null;
      }

      this.logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Failed to get from cache', { key, error });
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(
    key: string,
    value: unknown,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const namespace = this.getNamespace(options?.namespace);
      const serialized = JSON.stringify(value);

      const putOptions: KVNamespacePutOptions = {};
      if (options?.ttl) {
        putOptions.expirationTtl = options.ttl;
      }

      await namespace.put(key, serialized, putOptions);
      this.logger.debug('Cache set', { key, ttl: options?.ttl });
    } catch (error) {
      this.logger.error('Failed to set cache', { key, error });
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    try {
      const namespace = this.getNamespace(options?.namespace);
      await namespace.delete(key);
      this.logger.debug('Cache deleted', { key });
    } catch (error) {
      this.logger.error('Failed to delete from cache', { key, error });
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string, options?: CacheOptions): Promise<boolean> {
    const value = await this.get(key, options);
    return value !== null;
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * List keys with a prefix
   */
  async listKeys(prefix: string, options?: CacheOptions): Promise<string[]> {
    try {
      const namespace = this.getNamespace(options?.namespace);
      const list = await namespace.list({ prefix });
      return list.keys.map(k => k.name);
    } catch (error) {
      this.logger.error('Failed to list keys', { prefix, error });
      return [];
    }
  }

  /**
   * Invalidate keys by pattern
   */
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const keys = await this.listKeys(pattern, options);
      await Promise.all(keys.map(key => this.delete(key, options)));
      this.logger.info('Cache pattern invalidated', { pattern, count: keys.length });
      return keys.length;
    } catch (error) {
      this.logger.error('Failed to invalidate pattern', { pattern, error });
      return 0;
    }
  }

  private getNamespace(name?: 'CACHE' | 'SESSIONS' | 'CONFIG'): KVNamespace {
    switch (name) {
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
