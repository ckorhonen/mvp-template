/**
 * TypeScript type definitions for Cloudflare Workers
 */

import type {
  KVNamespace,
  R2Bucket,
  D1Database,
  ExecutionContext,
} from '@cloudflare/workers-types';

/**
 * Environment bindings interface
 * Add your Cloudflare service bindings here
 */
export interface Env {
  // Environment variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  
  // Cloudflare Account
  CLOUDFLARE_ACCOUNT_ID: string;
  
  // AI Gateway
  AI_GATEWAY_ID: string;
  OPENAI_API_KEY: string;
  
  // D1 Database
  DB: D1Database;
  
  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  
  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;
  
  // Feature flags
  FEATURE_AI_ENABLED?: string;
  FEATURE_ANALYTICS_ENABLED?: string;
  FEATURE_RATE_LIMITING_ENABLED?: string;
  
  // Optional: Analytics Engine
  // ANALYTICS?: AnalyticsEngineDataset;
  
  // Optional: Durable Objects
  // RATE_LIMITER?: DurableObjectNamespace;
  
  // Optional: Queue Producers
  // TASK_QUEUE?: Queue;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Database model interfaces
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at?: string;
}

export interface Session {
  id: string;
  user_id: number;
  data: string;
  expires_at: string;
  created_at: string;
}

export interface ApiKey {
  id: number;
  user_id: number;
  key_hash: string;
  name: string;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Item {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at?: string;
}

/**
 * OpenAI types (via AI Gateway)
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * R2 Object metadata
 */
export interface R2ObjectMetadata {
  key: string;
  size: number;
  etag: string;
  uploadedAt: Date;
  contentType?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Export ExecutionContext for use in handlers
 */
export type { ExecutionContext };
