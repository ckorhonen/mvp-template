/**
 * Environment bindings for Cloudflare Workers
 * These types define the bindings available in the worker runtime
 */

export interface Env {
  // AI Gateway Configuration
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_URL?: string;
  OPENAI_API_KEY?: string;

  // D1 Database Bindings
  DB: D1Database;

  // KV Namespace Bindings
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Bucket Bindings
  FILES: R2Bucket;
  ASSETS: R2Bucket;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;

  // Analytics Engine
  ANALYTICS?: AnalyticsEngineDataset;

  // Environment Configuration
  ENVIRONMENT: 'production' | 'staging' | 'development';
  API_BASE_URL?: string;

  // Feature Flags
  ENABLE_AI_FEATURES?: string;
  ENABLE_RATE_LIMITING?: string;

  // CORS Configuration
  ALLOWED_ORIGINS?: string;
}

/**
 * Context type for request handlers
 */
export interface Context {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
