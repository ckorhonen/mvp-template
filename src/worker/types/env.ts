/**
 * Cloudflare Workers Environment Bindings
 * This file defines all the TypeScript types for environment bindings
 */

export interface Env {
  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  CONFIG: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;
  BACKUPS: R2Bucket;

  // D1 Database
  DB: D1Database;

  // AI Binding
  AI: Ai;

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Queues
  TASK_QUEUE: Queue;
  EMAIL_QUEUE: Queue;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;

  // Environment Variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  API_VERSION: string;

  // AI Configuration
  AI_GATEWAY_ID: string;
  AI_DEFAULT_MODEL: string;
  AI_DEFAULT_TEMPERATURE: string;
  OPENAI_API_KEY: string;

  // Feature Flags
  FEATURE_AI_ENABLED: string;
  FEATURE_ANALYTICS_ENABLED: string;
  FEATURE_RATE_LIMITING_ENABLED: string;
  FEATURE_CACHING_ENABLED: string;

  // CORS Configuration
  CORS_ALLOWED_ORIGINS: string;
  CORS_MAX_AGE: string;

  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: string;
  RATE_LIMIT_REQUESTS_PER_HOUR: string;
}
