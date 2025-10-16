/**
 * Environment Types for Cloudflare Workers
 * All bindings and environment variables
 */

import type { D1Database, KVNamespace, R2Bucket, DurableObjectNamespace, Queue, AnalyticsEngineDataset } from '@cloudflare/workers-types';

// ===========================================
// Main Environment Interface
// ===========================================

export interface Env {
  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  API_VERSION: string;

  // AI Gateway Configuration
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

  // Authentication
  JWT_SECRET: string;
  SESSION_SECRET: string;

  // External Services
  SENDGRID_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

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

// ===========================================
// Context Types
// ===========================================

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
  ip: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface ExecutionContext extends globalThis.ExecutionContext {
  passThroughOnException(): void;
}

// ===========================================
// Feature Flag Helpers
// ===========================================

export function isFeatureEnabled(env: Env, feature: keyof Pick<Env, 'FEATURE_AI_ENABLED' | 'FEATURE_ANALYTICS_ENABLED' | 'FEATURE_RATE_LIMITING_ENABLED' | 'FEATURE_CACHING_ENABLED'>): boolean {
  return env[feature] === 'true';
}

export function getAllowedOrigins(env: Env): string[] {
  return env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
}

export function getRateLimitConfig(env: Env): { perMinute: number; perHour: number } {
  return {
    perMinute: parseInt(env.RATE_LIMIT_REQUESTS_PER_MINUTE, 10),
    perHour: parseInt(env.RATE_LIMIT_REQUESTS_PER_HOUR, 10)
  };
}
