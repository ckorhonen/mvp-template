/**
 * Environment bindings interface for Cloudflare Workers
 * This defines all the bindings available in the worker environment
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;

  // AI Gateway
  AI: Ai;

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Queues
  TASK_QUEUE: Queue;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;

  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  AI_GATEWAY_ID: string;
  OPENAI_API_KEY: string;
  JWT_SECRET: string;
  CORS_ORIGINS: string;
}

/**
 * Context passed to route handlers
 */
export interface WorkerContext {
  env: Env;
  ctx: ExecutionContext;
  request: Request;
}
