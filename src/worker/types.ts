// ===========================================
// Cloudflare Workers Types
// Comprehensive type definitions for all Cloudflare services
// ===========================================

import { Request as CfRequest } from '@cloudflare/workers-types';

// ===========================================
// Environment Bindings
// ===========================================

export interface Env {
  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
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
  AI: Ai;

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
// Request Context
// ===========================================

export interface RequestContext {
  request: CfRequest;
  env: Env;
  ctx: ExecutionContext;
  startTime: number;
  requestId: string;
  userId?: string;
}

// ===========================================
// Response Types
// ===========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  duration: number;
  version: string;
}

// ===========================================
// AI Gateway Types
// ===========================================

export interface AIGatewayConfig {
  gatewayId: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ===========================================
// D1 Database Types
// ===========================================

export interface D1Result<T = any> {
  success: boolean;
  results: T[];
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// ===========================================
// KV Types
// ===========================================

export interface CacheOptions {
  expirationTtl?: number;
  metadata?: Record<string, any>;
}

export interface CacheEntry<T = any> {
  value: T;
  metadata?: Record<string, any>;
  expiresAt?: number;
}

// ===========================================
// R2 Types
// ===========================================

export interface R2UploadOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  onlyIf?: R2Conditional;
}

export interface R2ObjectMetadata {
  key: string;
  size: number;
  etag: string;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  uploaded: Date;
}

// ===========================================
// Queue Types
// ===========================================

export interface TaskMessage {
  id: string;
  type: string;
  payload: Record<string, any>;
  retryCount?: number;
  createdAt: string;
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  metadata?: Record<string, any>;
}

// ===========================================
// Rate Limiting Types
// ===========================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  identifier: string; // IP or user ID
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

// ===========================================
// Analytics Types
// ===========================================

export interface AnalyticsEvent {
  timestamp?: number;
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

export interface RequestAnalytics extends AnalyticsEvent {
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
  userAgent?: string;
  country?: string;
}

// ===========================================
// Utility Types
// ===========================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export interface RouteHandler {
  (context: RequestContext): Promise<Response>;
}

export interface Middleware {
  (context: RequestContext, next: () => Promise<Response>): Promise<Response>;
}

export interface RouteConfig {
  path: string;
  method: HttpMethod;
  handler: RouteHandler;
  middleware?: Middleware[];
}

// ===========================================
// Error Types
// ===========================================

export class WorkerError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkerError';
  }
}

export class ValidationError extends WorkerError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends WorkerError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends WorkerError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends WorkerError {
  constructor(resetAt: number) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, { resetAt });
    this.name = 'RateLimitError';
  }
}
