/**
 * Comprehensive TypeScript type definitions for Cloudflare Workers MVP Template
 */

import type { D1Database, KVNamespace, R2Bucket, AnalyticsEngineDataset, Queue } from '@cloudflare/workers-types';

// ============================================
// Environment Bindings
// ============================================

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;

  // AI Binding
  AI: any; // Cloudflare AI binding

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Queues
  TASK_QUEUE: Queue;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;

  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  OPENAI_API_KEY: string;
  SESSION_SECRET: string;
  JWT_SECRET?: string;

  // Optional secrets
  WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  SENDGRID_API_KEY?: string;
  RESEND_API_KEY?: string;
}

// ============================================
// AI Service Types
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  userId?: string;
  stream?: boolean;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  userId?: string;
}

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface AIService {
  chatCompletion(request: ChatCompletionRequest): Promise<AIResponse>;
  embedding(request: EmbeddingRequest): Promise<AIResponse>;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  stack?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

// ============================================
// D1 Database Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
  updated_at: number;
  last_login_at?: number;
  is_active: number;
  metadata?: string; // JSON string
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
  ip_address?: string;
  user_agent?: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  scopes?: string; // JSON array
  created_at: number;
  last_used_at?: number;
  expires_at?: number;
  is_active: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: string; // JSON string
  ip_address?: string;
  created_at: number;
}

export interface DBQueryResult<T = any> {
  results: T[];
  success: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

// ============================================
// KV Cache Types
// ============================================

export interface CacheOptions {
  expirationTtl?: number;
  expiration?: number;
  metadata?: Record<string, any>;
}

export interface CacheEntry<T = any> {
  value: T;
  metadata?: Record<string, any>;
  cachedAt: string;
  expiresAt?: string;
}

// ============================================
// R2 Storage Types
// ============================================

export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
  customMetadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  etag: string;
  url: string;
  metadata: FileMetadata;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsEvent {
  timestamp?: number;
  event: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

// ============================================
// Queue Types
// ============================================

export interface TaskMessage {
  id: string;
  type: string;
  payload: Record<string, any>;
  retries?: number;
  createdAt: string;
}

export interface TaskResult {
  success: boolean;
  taskId: string;
  result?: any;
  error?: string;
}

// ============================================
// Request Context
// ============================================

export interface RequestContext {
  requestId: string;
  ip: string;
  country?: string;
  city?: string;
  region?: string;
  userAgent?: string;
  startTime: number;
}

// ============================================
// Middleware Types
// ============================================

export type MiddlewareHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext
) => Promise<Response | null>;

export type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext
) => Promise<Response>;

// ============================================
// Router Types
// ============================================

export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  pattern: string | RegExp;
  handler: RouteHandler;
  middleware?: MiddlewareHandler[];
}

export interface RouterConfig {
  basePath?: string;
  routes: Route[];
  notFoundHandler?: RouteHandler;
  errorHandler?: (error: Error, request: Request, env: Env) => Promise<Response>;
}
