/**
 * KV Cache utility functions
 */

import { CacheOptions } from '../types';

export class KVCache {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const list = await this.kv.list({ prefix });
    return list.keys.map((key) => key.name);
  }

  async getWithMetadata<T>(
    key: string
  ): Promise<{ value: T | null; metadata: any }> {
    const result = await this.kv.getWithMetadata(key, 'json');
    return {
      value: result.value as T | null,
      metadata: result.metadata,
    };
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }
}
