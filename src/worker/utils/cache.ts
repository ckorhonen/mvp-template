/**
 * Cache management utilities
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

/**
 * Cache key generator
 */
export function generateCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return [prefix, ...parts].join(':');
}

/**
 * Get from KV with automatic JSON parsing
 */
export async function getFromKV<T>(
  kv: KVNamespace,
  key: string
): Promise<T | null> {
  const value = await kv.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

/**
 * Set to KV with automatic JSON stringification
 */
export async function setToKV(
  kv: KVNamespace,
  key: string,
  value: unknown,
  options?: CacheOptions
): Promise<void> {
  const stringValue =
    typeof value === 'string' ? value : JSON.stringify(value);

  const kvOptions: KVNamespacePutOptions = {};
  if (options?.ttl) {
    kvOptions.expirationTtl = options.ttl;
  }

  await kv.put(key, stringValue, kvOptions);
}

/**
 * Delete from KV
 */
export async function deleteFromKV(
  kv: KVNamespace,
  key: string
): Promise<void> {
  await kv.delete(key);
}

/**
 * Get or set pattern (cache-aside)
 */
export async function getOrSet<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache
  const cached = await getFromKV<T>(kv, key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const value = await fetcher();
  await setToKV(kv, key, value, options);
  return value;
}

/**
 * Batch get from KV
 */
export async function batchGetFromKV<T>(
  kv: KVNamespace,
  keys: string[]
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();

  await Promise.all(
    keys.map(async (key) => {
      const value = await getFromKV<T>(kv, key);
      results.set(key, value);
    })
  );

  return results;
}

/**
 * List keys with prefix
 */
export async function listKeysWithPrefix(
  kv: KVNamespace,
  prefix: string,
  limit: number = 1000
): Promise<string[]> {
  const list = await kv.list({ prefix, limit });
  return list.keys.map((key) => key.name);
}
