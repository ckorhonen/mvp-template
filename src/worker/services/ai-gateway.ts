/**
 * AI Gateway Service
 * Provides integration with Cloudflare AI Gateway and OpenAI
 */

import type { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIGatewayError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export class AIGatewayService {
  private config: AIGatewayConfig;
  private env: Env;
  private baseUrl: string;

  constructor(env: Env) {
    this.env = env;
    this.config = {
      accountId: env.CLOUDFLARE_ACCOUNT_ID || '',
      gatewayId: env.AI_GATEWAY_ID || '',
      apiKey: env.OPENAI_API_KEY || '',
      model: env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7'),
      maxTokens: parseInt(env.AI_MAX_TOKENS || '1000', 10),
    };

    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}/openai`;
  }

  /**
   * Simple completion method for quick AI responses
   */
  async complete(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.createChatCompletion({
      model: options?.model || this.config.model || 'gpt-4o-mini',
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: ChatCompletionRequest
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
        const errorData = (await response.json()) as AIGatewayError;
        throw new Error(
          `AI Gateway error: ${errorData.error?.message || response.statusText}`
        );
      }

      return (await response.json()) as ChatCompletionResponse;
    } catch (error) {
      console.error('AI Gateway completion error:', error);
      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createChatCompletionStream(
    request: ChatCompletionRequest
  ): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AIGatewayError;
        throw new Error(
          `AI Gateway error: ${errorData.error?.message || response.statusText}`
        );
      }

      return response.body!;
    } catch (error) {
      console.error('AI Gateway stream error:', error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  async listModels(): Promise<string[]> {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];
  }

  /**
   * Cached completion - stores results in KV
   */
  async cachedComplete(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
      cacheTTL?: number;
    }
  ): Promise<string> {
    // Generate cache key
    const cacheKey = `ai:${this.hashString(
      JSON.stringify({
        prompt,
        system: options?.systemPrompt,
        temp: options?.temperature,
        model: options?.model,
      })
    )}`;

    // Try to get from cache
    if (this.env.CACHE) {
      const cached = await this.env.CACHE.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Generate new completion
    const result = await this.complete(prompt, options);

    // Store in cache
    if (this.env.CACHE) {
      await this.env.CACHE.put(cacheKey, result, {
        expirationTtl: options?.cacheTTL || 3600,
      });
    }

    return result;
  }

  /**
   * Simple hash function for cache keys
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
}

/**
 * Factory function to create AI Gateway service
 */
export function createAIGateway(env: Env): AIGatewayService {
  return new AIGatewayService(env);
}
