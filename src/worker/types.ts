/**
 * Comprehensive TypeScript types for Cloudflare Workers MVP Template
 * Covers all Cloudflare services: AI Gateway, D1, KV, R2, Durable Objects
 */

// Environment bindings for Cloudflare Workers
export interface Env {
  // KV Namespace bindings
  CACHE_KV?: KVNamespace;
  SESSION_KV?: KVNamespace;
  
  // D1 Database binding
  DB?: D1Database;
  
  // R2 Bucket bindings
  ASSETS_BUCKET?: R2Bucket;
  UPLOADS_BUCKET?: R2Bucket;
  
  // AI Gateway configuration
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_URL?: string;
  OPENAI_API_KEY?: string;
  
  // Durable Object bindings
  RATE_LIMITER?: DurableObjectNamespace;
  
  // Environment variables
  ENVIRONMENT?: 'development' | 'staging' | 'production';
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  CORS_ORIGINS?: string;
}

// AI Gateway Types
export interface AIGatewayRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIGatewayResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// D1 Database Types
export interface User {
  id: string;
  email: string;
  name: string;
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

export interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  user_id?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    request_id: string;
    duration_ms?: number;
  };
}

// Error Types
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Request Context
export interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
  env: Env;
}

// Router Types
export type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  context: RequestContext
) => Promise<Response>;

export interface Route {
  method: string;
  path: RegExp;
  handler: RouteHandler;
}

// KV Cache Types
export interface CacheOptions {
  expirationTtl?: number;
  metadata?: Record<string, any>;
}

// R2 Upload Types
export interface UploadOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface FileUpload {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
}
