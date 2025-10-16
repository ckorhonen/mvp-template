/**
 * Cloudflare AI Gateway Integration
 * Provides boilerplate for OpenAI integration with caching, rate limiting, and error handling
 */

import { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: 'openai' | 'azure-openai' | 'huggingface' | 'anthropic';
  apiKey: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
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

export class AIGatewayClient {
  private config: AIGatewayConfig;
  private baseUrl: string;

  constructor(config: AIGatewayConfig) {
    this.config = config;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/${config.provider}`;
  }

  /**
   * Create a chat completion using OpenAI through Cloudflare AI Gateway
   */
  async chatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `AI Gateway request failed: ${response.status} - ${error}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('AI Gateway error:', error);
      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async chatCompletionStream(
    request: ChatCompletionRequest,
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `AI Gateway streaming request failed: ${response.status} - ${error}`,
      );
    }

    return response.body!;
  }

  /**
   * Create embeddings for text
   */
  async createEmbedding(
    input: string | string[],
    model = 'text-embedding-ada-002',
  ): Promise<{ data: Array<{ embedding: number[]; index: number }> }> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ input, model }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Embedding request failed: ${response.status} - ${error}`,
      );
    }

    return await response.json();
  }
}

/**
 * Initialize AI Gateway client from environment
 */
export function createAIGatewayClient(env: Env): AIGatewayClient {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.AI_GATEWAY_ID) {
    throw new Error('AI Gateway not configured');
  }

  return new AIGatewayClient({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId: env.AI_GATEWAY_ID,
    provider: 'openai',
    apiKey: env.OPENAI_API_KEY,
  });
}

/**
 * Cached AI Gateway wrapper
 * Caches responses in KV to reduce API calls and costs
 */
export class CachedAIGateway {
  private client: AIGatewayClient;
  private cache: KVNamespace;
  private cacheTTL: number;

  constructor(
    client: AIGatewayClient,
    cache: KVNamespace,
    cacheTTL = 3600,
  ) {
    this.client = client;
    this.cache = cache;
    this.cacheTTL = cacheTTL;
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: ChatCompletionRequest): string {
    const key = JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
    });
    return `ai:${this.hashString(key)}`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Chat completion with caching
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    useCache = true,
  ): Promise<ChatCompletionResponse> {
    if (!useCache) {
      return this.client.chatCompletion(request);
    }

    const cacheKey = this.getCacheKey(request);
    const cached = await this.cache.get(cacheKey, 'json');

    if (cached) {
      return cached as ChatCompletionResponse;
    }

    const response = await this.client.chatCompletion(request);
    await this.cache.put(cacheKey, JSON.stringify(response), {
      expirationTtl: this.cacheTTL,
    });

    return response;
  }
}
