/**
 * Cloudflare Workers Type Definitions
 * Comprehensive types for all Cloudflare services
 */

/**
 * Environment bindings
 */
export interface Env {
  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  API_KEY: string;

  // Cloudflare Account
  CLOUDFLARE_ACCOUNT_ID: string;

  // AI Gateway
  AI_GATEWAY_ID: string;
  OPENAI_API_KEY: string;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;

  // D1 Database
  DB: D1Database;

  // AI (Cloudflare Workers AI)
  AI?: any;

  // Analytics Engine
  ANALYTICS?: AnalyticsEngineDataset;

  // Queues
  TASK_QUEUE?: Queue;

  // Durable Objects
  RATE_LIMITER?: DurableObjectNamespace;
}

/**
 * User model
 */
export interface User {
  id: number;
  email: string;
  name: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Session model
 */
export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

/**
 * API Log model
 */
export interface APILog {
  id: number;
  method: string;
  path: string;
  status: number;
  duration?: number;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Setting model
 */
export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * Request context
 */
export interface RequestContext {
  user?: User;
  session?: Session;
  startTime: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Pagination response
 */
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * API Response
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean;
  key: string;
  url: string;
  size: number;
  type?: string;
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number;
  metadata?: Record<string, string>;
}

/**
 * AI Chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * AI Generation options
 */
export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  system?: string;
}
