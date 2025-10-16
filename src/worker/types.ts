/**
 * TypeScript Type Definitions
 * 
 * Comprehensive type definitions for the Cloudflare Workers environment.
 */

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  // Cloudflare Account
  CLOUDFLARE_ACCOUNT_ID: string;
  
  // AI Gateway Configuration
  OPENAI_API_KEY: string;
  AI_GATEWAY_ID: string;
  AI_DEFAULT_MODEL: string;
  AI_DEFAULT_TEMPERATURE: string;
  
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
  
  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;
  
  // Queues
  TASK_QUEUE: Queue;
  EMAIL_QUEUE: Queue;
  
  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;
  
  // Environment Variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  API_VERSION: string;
  
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
}

/**
 * API Response Types
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Pagination Types
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * User Model
 */
export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Session Model
 */
export interface Session {
  id: string;
  userId: number;
  expiresAt: number;
  data: Record<string, unknown>;
}

/**
 * Cache Metadata
 */
export interface CacheMetadata {
  createdAt: number;
  expiresAt?: number;
  tags?: string[];
}

/**
 * Queue Message Types
 */
export interface TaskMessage {
  type: 'task';
  payload: {
    taskId: string;
    action: string;
    data: unknown;
  };
}

export interface EmailMessage {
  type: 'email';
  payload: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  };
}

export type QueueMessage = TaskMessage | EmailMessage;

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  timestamp: number;
  event: string;
  properties: Record<string, string | number>;
}

/**
 * Request Context
 */
export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: User;
  session?: Session;
}

/**
 * Rate Limit Info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * File Upload
 */
export interface FileUpload {
  key: string;
  fileName: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

/**
 * AI Gateway Types
 */
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
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Middleware Types
 */
export type Middleware = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  next: () => Promise<Response>
) => Promise<Response>;

export type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response>;
