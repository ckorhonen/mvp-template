/**
 * Cache Utilities for Cloudflare Workers
 * Provides caching helpers for KV and Cache API
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  cacheControl?: string;
  staleWhileRevalidate?: boolean;
}

const DEFAULT_TTL = 3600; // 1 hour

/**
 * Get data from KV cache with automatic JSON parsing
 * @param kv - KV namespace
 * @param key - Cache key
 * @returns Cached data or null
 */
export async function getFromKV<T = any>(
  kv: KVNamespace,
  key: string
): Promise<T | null> {
  const cached = await kv.get(key, { type: 'text' });
  if (!cached) return null;

  try {
    return JSON.parse(cached) as T;
  } catch {
    return cached as T;
  }
}

/**
 * Store data in KV cache with automatic JSON serialization
 * @param kv - KV namespace
 * @param key - Cache key
 * @param value - Data to cache
 * @param options - Cache options
 */
export async function setInKV(
  kv: KVNamespace,
  key: string,
  value: any,
  options: CacheOptions = {}
): Promise<void> {
  const ttl = options.ttl || DEFAULT_TTL;
  const data = typeof value === 'string' ? value : JSON.stringify(value);

  await kv.put(key, data, {
    expirationTtl: ttl,
  });
}

/**
 * Delete data from KV cache
 * @param kv - KV namespace
 * @param key - Cache key
 */
export async function deleteFromKV(
  kv: KVNamespace,
  key: string
): Promise<void> {
  await kv.delete(key);
}

/**
 * Cache response using Cloudflare Cache API
 * @param request - Request object
 * @param response - Response to cache
 * @param options - Cache options
 * @returns Cached response
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  options: CacheOptions = {}
): Promise<Response> {
  const cache = caches.default;
  const ttl = options.ttl || DEFAULT_TTL;

  // Clone the response before caching
  const responseToCache = response.clone();

  // Add cache headers
  const headers = new Headers(responseToCache.headers);
  headers.set(
    'Cache-Control',
    options.cacheControl || `public, max-age=${ttl}, s-maxage=${ttl}`
  );

  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers,
  });

  // Store in cache
  await cache.put(request, cachedResponse.clone());

  return response;
}

/**
 * Get response from cache
 * @param request - Request object
 * @returns Cached response or null
 */
export async function getCachedResponse(
  request: Request
): Promise<Response | null> {
  const cache = caches.default;
  return await cache.match(request);
}

/**
 * Cache-aside pattern: Try cache first, then fetch and cache
 * @param key - Cache key
 * @param kv - KV namespace
 * @param fetchFn - Function to fetch data if not cached
 * @param options - Cache options
 * @returns Data from cache or freshly fetched
 */
export async function cacheAside<T>(
  key: string,
  kv: KVNamespace,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await getFromKV<T>(kv, key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  await setInKV(kv, key, data, options);

  return data;
}

/**
 * Generate cache key from request
 * @param request - Request object
 * @param includeSearchParams - Whether to include query params in key
 * @returns Cache key
 */
export function generateCacheKey(
  request: Request,
  includeSearchParams: boolean = true
): string {
  const url = new URL(request.url);
  const path = url.pathname;
  const search = includeSearchParams ? url.search : '';
  const method = request.method;

  return `${method}:${path}${search}`;
}
