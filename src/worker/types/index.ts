/**
 * Cloudflare Workers Environment Bindings
 * These types define all the bindings available to your worker
 */

import { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

/**
 * Environment bindings interface
 * Add all your Cloudflare Workers bindings here
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSION: KVNamespace;

  // R2 Storage Bucket
  STORAGE: R2Bucket;

  // AI binding (Cloudflare Workers AI)
  AI?: any; // Replace with proper AI binding type when available

  // Environment variables
  OPENAI_API_KEY: string;
  AI_GATEWAY_ENDPOINT: string;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  CORS_ALLOWED_ORIGINS?: string;

  // Optional Queue producers
  TASK_QUEUE?: any;

  // Optional Analytics Engine
  ANALYTICS?: any;
}

/**
 * Extended Request with additional context
 */
export interface WorkerRequest extends Request {
  user?: User;
  requestId?: string;
}

/**
 * User model
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Item model
 */
export interface Item {
  id: number;
  userId: number;
  title: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
}

/**
 * Session data
 */
export interface Session {
  id: string;
  userId: number;
  expiresAt: number;
  data?: Record<string, any>;
  createdAt: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId?: string;
    timestamp: number;
    version?: string;
  };
}

/**
 * API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    requestId?: string;
    timestamp: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * OpenAI Chat Completion Request
 */
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * OpenAI Embedding Request
 */
export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key: string;
  namespace?: 'CACHE' | 'SESSION';
}

/**
 * File upload metadata
 */
export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  uploadedBy?: number;
  metadata?: Record<string, any>;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    database: { status: 'up' | 'down'; latency?: number };
    kv: { status: 'up' | 'down'; latency?: number };
    r2: { status: 'up' | 'down'; latency?: number };
    ai: { status: 'up' | 'down'; latency?: number };
  };
  version?: string;
}
