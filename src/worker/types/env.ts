/**
 * Cloudflare Workers Environment Bindings
 * Define all your Cloudflare service bindings here
 */

export interface Env {
  // KV Namespaces
  MY_KV: KVNamespace;
  CACHE_KV?: KVNamespace;

  // R2 Buckets
  MY_BUCKET: R2Bucket;
  ASSETS_BUCKET?: R2Bucket;

  // D1 Databases
  DB: D1Database;

  // Durable Objects
  // MY_DURABLE_OBJECT: DurableObjectNamespace;

  // AI Gateway
  AI_GATEWAY_ID?: string;
  OPENAI_API_KEY?: string;

  // Service Bindings
  // MY_SERVICE: Fetcher;

  // Analytics Engine
  // MY_ANALYTICS: AnalyticsEngineDataset;

  // Queue
  // MY_QUEUE: Queue;

  // Secrets
  API_SECRET?: string;
  WEBHOOK_SECRET?: string;

  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Hyperdrive (Database Pooling)
  // HYPERDRIVE: Hyperdrive;

  // Vectorize (Vector Database)
  // VECTORIZE_INDEX: VectorizeIndex;
}

/**
 * Type-safe environment variable access
 */
export function getEnvVar<K extends keyof Env>(
  env: Env,
  key: K,
  required: true
): NonNullable<Env[K]>;
export function getEnvVar<K extends keyof Env>(
  env: Env,
  key: K,
  required?: false
): Env[K] | undefined;
export function getEnvVar<K extends keyof Env>(
  env: Env,
  key: K,
  required = false
): Env[K] | undefined {
  const value = env[key];
  if (required && value === undefined) {
    throw new Error(`Required environment variable ${String(key)} is not set`);
  }
  return value;
}
