/**
 * Comprehensive TypeScript types for Cloudflare Workers
 */

// Environment bindings interface
export interface Env {
  // KV Namespace bindings
  MY_KV: KVNamespace;
  
  // D1 Database bindings
  DB: D1Database;
  
  // R2 Bucket bindings
  MY_BUCKET: R2Bucket;
  
  // AI Gateway configuration
  AI_GATEWAY_ID: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  
  // OpenAI API Key (stored as secret)
  OPENAI_API_KEY: string;
  
  // Analytics Engine bindings
  ANALYTICS: AnalyticsEngineDataset;
  
  // Environment variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
}

// Request context with type safety
export interface RequestContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
}

// Standard API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

// AI Gateway request/response types
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

// D1 database query result types
export interface D1Result<T = any> {
  success: boolean;
  results?: T[];
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

// Error types
export class WorkerError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'WorkerError';
  }
}

// Route handler type
export type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params?: Record<string, string>
) => Promise<Response>;

// Middleware type
export type Middleware = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  next: () => Promise<Response>
) => Promise<Response>;
