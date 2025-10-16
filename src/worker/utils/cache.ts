/**
 * Cache utilities for KV and Cache API
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import type { CacheOptions } from '../types';

/**
 * KV Cache wrapper with automatic serialization
 */
export class KVCache {
  constructor(private readonly kv: KVNamespace) {}

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'text');
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a cached value
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.kv.put(key, serialized, {
        expirationTtl: options?.ttl,
        metadata: options?.tags ? { tags: options.tags } : undefined,
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.kv.get(key);
      return value !== null;
    } catch (error) {
      console.error(`Cache has error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * List keys with optional prefix
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const list = await this.kv.list({ prefix });
      return list.keys.map(key => key.name);
    } catch (error) {
      console.error('Cache list error:', error);
      return [];
    }
  }
}

/**
 * Cache API wrapper
 */
export class WorkerCache {
  private readonly cacheName: string;

  constructor(cacheName: string = 'default') {
    this.cacheName = cacheName;
  }

  /**
   * Get cached response
   */
  async get(request: Request | string): Promise<Response | undefined> {
    try {
      const cache = await caches.open(this.cacheName);
      return await cache.match(request);
    } catch (error) {
      console.error('Cache API get error:', error);
      return undefined;
    }
  }

  /**
   * Put response in cache
   */
  async put(request: Request | string, response: Response): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      await cache.put(request, response.clone());
    } catch (error) {
      console.error('Cache API put error:', error);
      throw error;
    }
  }

  /**
   * Delete cached response
   */
  async delete(request: Request | string): Promise<boolean> {
    try {
      const cache = await caches.open(this.cacheName);
      return await cache.delete(request);
    } catch (error) {
      console.error('Cache API delete error:', error);
      return false;
    }
  }
}

/**
 * Caching middleware for fetch requests
 */
export async function withCache(
  request: Request,
  fetcher: () => Promise<Response>,
  options: CacheOptions
): Promise<Response> {
  const cache = new WorkerCache();
  
  // Try to get from cache
  const cached = await cache.get(request);
  if (cached) {
    return cached;
  }

  // Fetch and cache
  const response = await fetcher();
  
  // Only cache successful responses
  if (response.ok) {
    const cacheResponse = response.clone();
    // Add cache control headers
    cacheResponse.headers.set(
      'Cache-Control',
      `public, max-age=${options.ttl}`
    );
    await cache.put(request, cacheResponse);
  }

  return response;
}
