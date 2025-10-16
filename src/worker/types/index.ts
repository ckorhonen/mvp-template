/**
 * Type definitions for Cloudflare Workers MVP Template
 */

// Environment bindings
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespace
  KV: KVNamespace;
  
  // R2 Bucket
  BUCKET: R2Bucket;
  
  // Environment variables
  OPENAI_API_KEY: string;
  AI_GATEWAY_URL: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// D1 Database types
export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// AI Gateway types
export interface OpenAICompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAICompletionResponse {
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

export interface OpenAIEmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Request/Response helpers
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Storage types
export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}
