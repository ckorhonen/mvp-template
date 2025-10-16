/**
 * Cloudflare Workers Environment Bindings
 * TypeScript type definitions for all Cloudflare services
 */

export interface Env {
  // Environment variables
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
  AI: any; // Cloudflare AI binding

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Queues
  TASK_QUEUE: Queue;
  EMAIL_QUEUE: Queue;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;
}

// Additional type definitions for better type safety
export interface AIGatewayRequest {
  model: string;
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIGatewayResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: { role: string; content: string };
    text?: string;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DatabaseRecord {
  id?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CacheOptions {
  ttl?: number;
  expirationTtl?: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}
