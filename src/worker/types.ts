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
  AI_GATEWAY_ID: string;
  OPENAI_API_KEY: string;

  // Optional secrets
  SESSION_SECRET?: string;
  WEBHOOK_SECRET?: string;
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
// AI Gateway Types
// ============================================

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'workers-ai';
  model: string;
  cacheTTL?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: ChatMessage;
    finishReason: string;
    index: number;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached?: boolean;
}

// ============================================
// D1 Database Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface DBQueryResult<T = any> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rowsRead: number;
    rowsWritten: number;
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
