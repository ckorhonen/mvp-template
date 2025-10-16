/**
 * KV Utility Functions
 * Helpers for working with Cloudflare KV namespaces
 */

import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  expirationTtl?: number; // Expiration TTL
  metadata?: Record<string, unknown>;
}

/**
 * Get a value from KV with JSON parsing
 */
export async function getJSON<T = unknown>(
  kv: KVNamespace,
  key: string
): Promise<T | null> {
  return await kv.get<T>(key, 'json');
}

/**
 * Set a value in KV with JSON serialization
 */
export async function putJSON<T = unknown>(
  kv: KVNamespace,
  key: string,
  value: T,
  config?: CacheConfig
): Promise<void> {
  await kv.put(key, JSON.stringify(value), {
    expirationTtl: config?.expirationTtl || config?.ttl,
    metadata: config?.metadata,
  });
}

/**
 * Get or set pattern (cache-aside)
 */
export async function getOrSet<T = unknown>(
  kv: KVNamespace,
  key: string,
  factory: () => Promise<T>,
  config?: CacheConfig
): Promise<T> {
  // Try to get from cache
  const cached = await getJSON<T>(kv, key);
  if (cached !== null) {
    return cached;
  }

  // Generate and cache
  const value = await factory();
  await putJSON(kv, key, value, config);
  return value;
}

/**
 * Delete a key from KV
 */
export async function del(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

/**
 * List keys with optional prefix
 */
export async function listKeys(
  kv: KVNamespace,
  prefix?: string,
  limit?: number
): Promise<string[]> {
  const result = await kv.list({ prefix, limit });
  return result.keys.map((k) => k.name);
}

/**
 * Bulk delete keys with prefix
 */
export async function deleteByPrefix(
  kv: KVNamespace,
  prefix: string
): Promise<number> {
  const keys = await listKeys(kv, prefix, 1000);
  await Promise.all(keys.map((key) => del(kv, key)));
  return keys.length;
}

/**
 * Get with metadata
 */
export async function getWithMetadata<T = unknown, M = unknown>(
  kv: KVNamespace,
  key: string
): Promise<{ value: T | null; metadata: M | null }> {
  const result = await kv.getWithMetadata<T, M>(key, 'json');
  return { value: result.value, metadata: result.metadata };
}
