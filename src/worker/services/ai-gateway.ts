/**
 * Cloudflare AI Gateway Service
 * Provides integration with Cloudflare AI Gateway for OpenAI API calls
 * with built-in caching, rate limiting, and cost tracking
 */

import type { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  apiKey: string;
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  n?: number;
  user?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
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

export class AIGatewayService {
  private env: Env;
  private config: AIGatewayConfig;

  constructor(env: Env) {
    this.env = env;
    this.config = {
      accountId: env.CLOUDFLARE_ACCOUNT_ID || '',
      gatewayId: env.AI_GATEWAY_ID || '',
      apiKey: env.OPENAI_API_KEY || '',
    };
  }

  /**
   * Get the AI Gateway endpoint URL
   */
  private getGatewayUrl(provider: string = 'openai'): string {
    const { accountId, gatewayId } = this.config;
    return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/${provider}`;
  }

  /**
   * Make a request to the AI Gateway
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.getGatewayUrl()}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway request failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Create a chat completion
   * @param request - Chat completion request parameters
   * @returns Chat completion response
   */
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      // Use default model if not specified
      const model = request.model || this.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
      const temperature = request.temperature || parseFloat(this.env.AI_DEFAULT_TEMPERATURE || '0.7');

      const response = await this.makeRequest<ChatCompletionResponse>(
        '/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify({
            ...request,
            model,
            temperature,
          }),
        }
      );

      // Track usage in analytics if enabled
      if (this.env.FEATURE_ANALYTICS_ENABLED === 'true' && this.env.ANALYTICS) {
        await this.trackUsage('chat_completion', response.usage.total_tokens, model);
      }

      return response;
    } catch (error) {
      console.error('Chat completion error:', error);
      throw error;
    }
  }

  /**
   * Create embeddings for text
   * @param request - Embedding request parameters
   * @returns Embedding response
   */
  async createEmbedding(
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    try {
      const response = await this.makeRequest<EmbeddingResponse>(
        '/embeddings',
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      // Track usage
      if (this.env.FEATURE_ANALYTICS_ENABLED === 'true' && this.env.ANALYTICS) {
        await this.trackUsage('embedding', response.usage.total_tokens, request.model);
      }

      return response;
    } catch (error) {
      console.error('Embedding error:', error);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<any> {
    try {
      return await this.makeRequest('/models', {
        method: 'GET',
      });
    } catch (error) {
      console.error('List models error:', error);
      throw error;
    }
  }

  /**
   * Track AI usage in Analytics Engine
   */
  private async trackUsage(
    operation: string,
    tokens: number,
    model: string
  ): Promise<void> {
    try {
      if (this.env.ANALYTICS) {
        await this.env.ANALYTICS.writeDataPoint({
          blobs: [operation, model],
          doubles: [tokens],
          indexes: [Date.now().toString()],
        });
      }
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - tracking failure shouldn't break the request
    }
  }

  /**
   * Simple chat helper for common use cases
   */
  async chat(
    userMessage: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionRequest>
  ): Promise<string> {
    const messages: ChatCompletionMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await this.createChatCompletion({
      messages,
      ...options,
      model: options?.model || this.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    });

    return response.choices[0]?.message?.content || '';
  }
}

/**
 * Create an AI Gateway service instance
 */
export function createAIGatewayService(env: Env): AIGatewayService {
  return new AIGatewayService(env);
}
