/**
 * AI Gateway Types for Cloudflare Workers
 * Comprehensive TypeScript types for AI Gateway integration with OpenAI
 */

// ===========================================
// OpenAI Chat Completion Types
// ===========================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  functions?: ChatFunction[];
  function_call?: 'none' | 'auto' | { name: string };
}

export interface ChatFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: TokenUsage;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ===========================================
// OpenAI Embeddings Types
// ===========================================

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
}

export interface EmbeddingResponse {
  object: 'list';
  data: EmbeddingData[];
  model: string;
  usage: TokenUsage;
}

export interface EmbeddingData {
  object: 'embedding';
  embedding: number[];
  index: number;
}

// ===========================================
// AI Gateway Configuration
// ===========================================

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  apiKey: string;
  defaultModel?: string;
  defaultTemperature?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface AIGatewayRequestMetadata {
  requestId: string;
  userId?: string;
  model: string;
  timestamp: number;
  costEstimate?: number;
}

// ===========================================
// Error Types
// ===========================================

export interface AIGatewayError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export class AIGatewayException extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AIGatewayException';
  }
}

// ===========================================
// Stream Types
// ===========================================

export interface ChatCompletionStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finish_reason: 'stop' | 'length' | 'function_call' | null;
}

// ===========================================
// Helper Types
// ===========================================

export type AIModel = 
  | 'gpt-4o'
  | 'gpt-4o-mini' 
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002';

export interface AIGatewayMetrics {
  requestCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  averageLatency: number;
}
