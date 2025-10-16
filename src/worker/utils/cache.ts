/**
 * Cache utility functions for KV and Cache API
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  metadata?: Record<string, any>;
}

export class CacheManager {
  /**
   * Get data from KV with automatic JSON parsing
   */
  static async getFromKV<T>(
    kv: KVNamespace,
    key: string
  ): Promise<T | null> {
    const value = await kv.get(key, { type: 'json' });
    return value as T | null;
  }

  /**
   * Set data in KV with automatic JSON serialization
   */
  static async setInKV<T>(
    kv: KVNamespace,
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const kvOptions: KVNamespacePutOptions = {};
    
    if (options?.ttl) {
      kvOptions.expirationTtl = options.ttl;
    }
    
    if (options?.metadata) {
      kvOptions.metadata = options.metadata;
    }

    await kv.put(key, JSON.stringify(value), kvOptions);
  }

  /**
   * Delete data from KV
   */
  static async deleteFromKV(
    kv: KVNamespace,
    key: string
  ): Promise<void> {
    await kv.delete(key);
  }

  /**
   * Cache API wrapper for HTTP responses
   */
  static async cacheResponse(
    request: Request,
    response: Response,
    cacheName: string = 'default',
    ttl: number = 3600
  ): Promise<Response> {
    // Clone response before caching
    const responseToCache = response.clone();
    
    // Add cache headers
    const headers = new Headers(responseToCache.headers);
    headers.set('Cache-Control', `public, max-age=${ttl}`);
    
    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers,
    });

    // Store in cache
    const cache = await caches.open(cacheName);
    await cache.put(request, cachedResponse);

    return response;
  }

  /**
   * Get cached response
   */
  static async getCached(
    request: Request,
    cacheName: string = 'default'
  ): Promise<Response | undefined> {
    const cache = await caches.open(cacheName);
    return await cache.match(request);
  }

  /**
   * Generate cache key from request
   */
  static generateCacheKey(request: Request, suffix?: string): string {
    const url = new URL(request.url);
    const key = `${url.pathname}${url.search}`;
    return suffix ? `${key}:${suffix}` : key;
  }
}
