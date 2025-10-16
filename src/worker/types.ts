/**
 * Type definitions for Cloudflare Workers MVP Template
 */

import { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

/**
 * Environment bindings and variables
 */
export interface Env {
  // Cloudflare Account
  CLOUDFLARE_ACCOUNT_ID: string;

  // OpenAI Configuration
  OPENAI_API_KEY: string;

  // AI Gateway
  AI_GATEWAY_ID: string;

  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;

  // Worker Configuration
  ENVIRONMENT: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  API_VERSION?: string;

  // CORS Configuration
  CORS_ALLOWED_ORIGINS?: string;

  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;

  // Session Configuration
  SESSION_DURATION_SECONDS?: string;
  SESSION_SECRET?: string;

  // Feature Flags
  FEATURE_AI_ENABLED?: string;
  FEATURE_ANALYTICS_ENABLED?: string;
}

/**
 * Request context (can be extended with auth, user info, etc.)
 */
export interface RequestContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Database models
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  data?: string;
  created_at: number;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name?: string;
  last_used_at?: number;
  expires_at?: number;
  created_at: number;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  settings?: string;
  created_at: number;
  updated_at: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: number;
}
