/**
 * Cloudflare AI Gateway Service
 * 
 * Provides a type-safe interface for interacting with OpenAI via Cloudflare AI Gateway.
 * Includes caching, rate limiting, and comprehensive error handling.
 */

import type { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  apiKey: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
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
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
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
  private cache?: KVNamespace;
  private cacheTTL: number = 3600; // 1 hour default

  constructor(config: AIGatewayConfig, cache?: KVNamespace) {
    this.config = config;
    this.cache = cache;
  }

  /**
   * Get the AI Gateway endpoint URL
   */
  private getEndpoint(): string {
    return `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}/openai`;
  }

  /**
   * Generate a cache key for a request
   */
  private getCacheKey(request: ChatCompletionRequest): string {
    const hash = JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    });
    return `ai:chat:${btoa(hash).substring(0, 32)}`;
  }

  /**
   * Create a chat completion via AI Gateway
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
    options: { useCache?: boolean; cacheTTL?: number } = {}
  ): Promise<ChatCompletionResponse> {
    const { useCache = true, cacheTTL = this.cacheTTL } = options;

    // Check cache first
    if (useCache && this.cache) {
      const cacheKey = this.getCacheKey(request);
      const cached = await this.cache.get(cacheKey, 'json');
      if (cached) {
        return cached as ChatCompletionResponse;
      }
    }

    // Make the API request
    const response = await fetch(`${this.getEndpoint()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json() as AIGatewayError;
      throw new Error(
        `AI Gateway error: ${error.error.message} (${response.status})`
      );
    }

    const data = await response.json() as ChatCompletionResponse;

    // Cache the response
    if (useCache && this.cache) {
      const cacheKey = this.getCacheKey(request);
      await this.cache.put(cacheKey, JSON.stringify(data), {
        expirationTtl: cacheTTL,
      });
    }

    return data;
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    request: ChatCompletionRequest
  ): Promise<Response> {
    const streamRequest = { ...request, stream: true };

    const response = await fetch(`${this.getEndpoint()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(streamRequest),
    });

    if (!response.ok) {
      const error = await response.json() as AIGatewayError;
      throw new Error(
        `AI Gateway error: ${error.error.message} (${response.status})`
      );
    }

    return response;
  }

  /**
   * Simple helper for single-message completions
   */
  async complete(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options.systemPrompt) {
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
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    });

    return response.choices[0]?.message.content || '';
  }
}

/**
 * Create an AI Gateway service instance from environment
 */
export function createAIGateway(env: Env): AIGatewayService {
  return new AIGatewayService(
    {
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      gatewayId: env.AI_GATEWAY_ID,
      apiKey: env.OPENAI_API_KEY,
    },
    env.CACHE
  );
}

/**
 * Example usage patterns
 */
export const AIGatewayExamples = {
  // Simple completion
  async simpleCompletion(env: Env) {
    const ai = createAIGateway(env);
    const result = await ai.complete('What is Cloudflare?');
    return result;
  },

  // Chat with system prompt
  async chatWithSystem(env: Env, userMessage: string) {
    const ai = createAIGateway(env);
    const result = await ai.complete(userMessage, {
      systemPrompt: 'You are a helpful assistant specialized in web development.',
      temperature: 0.8,
    });
    return result;
  },

  // Full chat completion
  async fullChatCompletion(env: Env) {
    const ai = createAIGateway(env);
    const response = await ai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    return response;
  },

  // Streaming response
  async streamingCompletion(env: Env) {
    const ai = createAIGateway(env);
    const stream = await ai.createStreamingChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Tell me a story' },
      ],
    });
    return stream;
  },
};
