/**
 * Database models and types
 */

/**
 * User model
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  name: string;
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
}

/**
 * AI Chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI chat completion request
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * OpenAI chat completion response
 */
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

/**
 * File metadata for R2
 */
export interface FileMetadata {
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  value: T;
  cachedAt: string;
  expiresAt?: string;
}
