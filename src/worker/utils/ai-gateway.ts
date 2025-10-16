/**
 * Cloudflare AI Gateway integration with OpenAI
 * Provides cost tracking, caching, and rate limiting for AI requests
 */

import { Env } from '../types';

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

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
}

export interface EmbeddingResponse {
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

/**
 * AI Gateway Client
 */
export class AIGatewayClient {
  private accountId: string;
  private gatewayId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(env: Env) {
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.AI_GATEWAY_ID || !env.OPENAI_API_KEY) {
      throw new Error('Missing required AI Gateway configuration');
    }

    this.accountId = env.CLOUDFLARE_ACCOUNT_ID;
    this.gatewayId = env.AI_GATEWAY_ID;
    this.apiKey = env.OPENAI_API_KEY;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.accountId}/${this.gatewayId}/openai`;
  }

  /**
   * Make a request to AI Gateway
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    return this.request<ChatCompletionResponse>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Create embeddings
   */
  async createEmbeddings(
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    return this.request<EmbeddingResponse>('/embeddings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ data: Array<{ id: string; object: string; created: number }> }> {
    return this.request('/models', {
      method: 'GET',
    });
  }

  /**
   * Generate a simple completion (helper method)
   */
  async simpleCompletion(
    prompt: string,
    options: Partial<ChatCompletionRequest> = {}
  ): Promise<string> {
    const response = await this.createChatCompletion({
      model: options.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      ...options,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate embeddings for a single text
   */
  async embedText(text: string, model = 'text-embedding-ada-002'): Promise<number[]> {
    const response = await this.createEmbeddings({
      model,
      input: text,
    });

    return response.data[0]?.embedding || [];
  }
}

/**
 * Create an AI Gateway client from environment
 */
export function createAIGatewayClient(env: Env): AIGatewayClient {
  return new AIGatewayClient(env);
}
