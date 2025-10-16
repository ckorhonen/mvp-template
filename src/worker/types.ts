// ===========================================
// Cloudflare Workers MVP Template - Type Definitions
// Complete TypeScript types for all Cloudflare services
// ===========================================

import { D1Database, KVNamespace, R2Bucket, Ai } from '@cloudflare/workers-types';

/**
 * Main Environment Bindings
 * All Cloudflare services available in the worker
 */
export interface Env {
  // Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  CONFIG: KVNamespace;

  // R2 Buckets
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;
  BACKUPS: R2Bucket;

  // AI Bindings
  AI: Ai;

  // Environment Variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
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

  // Queue Bindings
  TASK_QUEUE: Queue;
  EMAIL_QUEUE: Queue;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;

  // Analytics
  ANALYTICS: AnalyticsEngineDataset;
}

/**
 * Request Context
 * Extended context passed through middleware chain
 */
export interface RequestContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  startTime: number;
  requestId: string;
  clientIp?: string;
  userAgent?: string;
  path: string;
  method: string;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Headers;
}

/**
 * API Response Structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    duration: number;
  };
}

/**
 * Error Types
 */
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * AI Gateway Types
 */
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
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Database Types
 */
export interface DbUser {
  id: string;
  email: string;
  name: string;
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

/**
 * Cache Types
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  tags?: string[];
}

/**
 * Storage Types (R2)
 */
export interface StorageObject {
  key: string;
  size: number;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  customMetadata?: Record<string, string>;
  httpMetadata?: R2HTTPMetadata;
}

/**
 * Queue Types
 */
export interface TaskMessage {
  id: string;
  type: string;
  payload: any;
  attempts: number;
  createdAt: string;
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Analytics Types
 */
export interface AnalyticsEvent {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

export interface RequestAnalytics {
  timestamp: number;
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  country?: string;
}

/**
 * Rate Limiting Types
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Middleware Types
 */
export type Middleware = (
  context: RequestContext,
  next: () => Promise<Response>
) => Promise<Response>;

export type RouteHandler = (context: RequestContext) => Promise<Response>;

/**
 * Route Configuration
 */
export interface Route {
  method: string;
  path: string | RegExp;
  handler: RouteHandler;
  middleware?: Middleware[];
}

/**
 * Logger Types
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  data?: any;
}

/**
 * Utility Types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaitable<T> = T | Promise<T>;
