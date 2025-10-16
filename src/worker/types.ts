/**
 * Comprehensive Type Definitions for Cloudflare Workers MVP Template
 */

import type { KVNamespace, R2Bucket, D1Database, Queue, DurableObjectNamespace } from '@cloudflare/workers-types';

/**
 * Environment bindings and configuration
 */
export interface Env {
  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;

  // D1 Databases
  DB: D1Database;

  // Queues
  TASK_QUEUE: Queue;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;

  // AI Gateway
  AI_GATEWAY_ID: string;
  CLOUDFLARE_ACCOUNT_ID: string;

  // API Keys (Secrets)
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  HUGGINGFACE_API_KEY: string;
  REPLICATE_API_KEY: string;
  JWT_SECRET: string;

  // Optional: Analytics
  ANALYTICS?: AnalyticsEngineDataset;
}

/**
 * Analytics Engine Dataset
 */
export interface AnalyticsEngineDataset {
  writeDataPoint(event: AnalyticsEvent): void;
}

export interface AnalyticsEvent {
  indexes?: string[];
  blobs?: string[];
  doubles?: number[];
}

/**
 * HTTP Context
 */
export interface Context {
  request: Request;
  env: Env;
  executionCtx: ExecutionContext;
  // Middleware-injected properties
  user?: User;
  session?: Session;
  requestId: string;
  startTime: number;
}

/**
 * User model
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Session model
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * API Response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * API Error format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Database Models
 */
export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface DbApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
}

/**
 * Route Handler
 */
export type RouteHandler = (
  ctx: Context,
  params?: Record<string, string>
) => Promise<Response> | Response;

/**
 * Middleware
 */
export type Middleware = (
  ctx: Context,
  next: () => Promise<Response>
) => Promise<Response>;

/**
 * Router Configuration
 */
export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
  path: string;
  handler: RouteHandler;
  middleware?: Middleware[];
}

/**
 * Cache Options
 */
export interface CacheOptions {
  ttl: number; // seconds
  key?: string;
  tags?: string[];
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  limit: number; // requests
  window: number; // seconds
  identifier: string; // IP, user ID, etc.
}

/**
 * File Upload
 */
export interface FileUpload {
  filename: string;
  contentType: string;
  size: number;
  buffer: ArrayBuffer;
}

/**
 * Queue Message
 */
export interface QueueMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  retryCount?: number;
}

/**
 * Webhook Event
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Pagination
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
