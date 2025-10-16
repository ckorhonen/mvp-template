/**
 * Cloudflare AI Gateway Integration
 * Provides unified interface for AI model interactions with built-in caching,
 * rate limiting, and error handling.
 */

import type { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: 'openai' | 'anthropic' | 'huggingface' | 'replicate';
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
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

export interface AIGatewayError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * AI Gateway Service
 * Handles all AI model interactions through Cloudflare AI Gateway
 */
export class AIGatewayService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly config: AIGatewayConfig;

  constructor(env: Env, config: AIGatewayConfig) {
    this.config = config;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/${config.provider}`;
    this.apiKey = this.getApiKey(env, config.provider);
  }

  private getApiKey(env: Env, provider: string): string {
    switch (provider) {
      case 'openai':
        return env.OPENAI_API_KEY;
      case 'anthropic':
        return env.ANTHROPIC_API_KEY;
      case 'huggingface':
        return env.HUGGINGFACE_API_KEY;
      case 'replicate':
        return env.REPLICATE_API_KEY;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Send a chat completion request
   */
  async chatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const endpoint = this.getEndpoint('chat/completions');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          ...request,
        }),
      });

      if (!response.ok) {
        const error = await response.json<AIGatewayError>();
        throw new Error(
          `AI Gateway error: ${error.error.message} (${response.status})`
        );
      }

      return await response.json<ChatCompletionResponse>();
    } catch (error) {
      throw new Error(
        `Failed to complete chat: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stream a chat completion response
   */
  async streamChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ReadableStream> {
    try {
      const endpoint = this.getEndpoint('chat/completions');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json<AIGatewayError>();
        throw new Error(
          `AI Gateway error: ${error.error.message} (${response.status})`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      return response.body;
    } catch (error) {
      throw new Error(
        `Failed to stream chat: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(
    input: string | string[],
    model: string = 'text-embedding-ada-002'
  ): Promise<number[][]> {
    try {
      const endpoint = this.getEndpoint('embeddings');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input,
        }),
      });

      if (!response.ok) {
        const error = await response.json<AIGatewayError>();
        throw new Error(
          `AI Gateway error: ${error.error.message} (${response.status})`
        );
      }

      const data = await response.json<{
        data: Array<{ embedding: number[] }>;
      }>();
      
      return data.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getEndpoint(path: string): string {
    return `${this.baseUrl}/${path}`;
  }
}

/**
 * Create an AI Gateway service instance
 */
export function createAIGateway(
  env: Env,
  provider: AIGatewayConfig['provider'] = 'openai',
  model: string = 'gpt-4-turbo-preview'
): AIGatewayService {
  const config: AIGatewayConfig = {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId: env.AI_GATEWAY_ID,
    provider,
    model,
  };

  return new AIGatewayService(env, config);
}
