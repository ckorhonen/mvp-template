/**
 * Cloudflare AI Gateway Integration
 * 
 * This module provides a wrapper around OpenAI API calls through Cloudflare AI Gateway.
 * Benefits:
 * - Caching of responses
 * - Rate limiting
 * - Analytics and logging
 * - Cost optimization
 */

import { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: 'openai' | 'anthropic' | 'huggingface';
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
  private baseUrl: string;
  private apiKey: string;

  constructor(
    private config: AIGatewayConfig,
    apiKey: string,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/${config.provider}`;
  }

  /**
   * Create a chat completion using OpenAI through AI Gateway
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `AI Gateway request failed: ${response.status} ${response.statusText} - ${error}`,
      );
    }

    return response.json();
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok || !response.body) {
      const error = await response.text();
      throw new Error(
        `AI Gateway streaming request failed: ${response.status} ${response.statusText} - ${error}`,
      );
    }

    return response.body;
  }

  /**
   * Create embeddings using OpenAI through AI Gateway
   */
  async createEmbedding(input: string | string[], model = 'text-embedding-ada-002') {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `AI Gateway embedding request failed: ${response.status} ${response.statusText} - ${error}`,
      );
    }

    return response.json();
  }
}

/**
 * Create an AI Gateway client from environment variables
 */
export function createAIGatewayClient(env: Env): AIGatewayClient {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.AI_GATEWAY_ID) {
    throw new Error(
      'CLOUDFLARE_ACCOUNT_ID and AI_GATEWAY_ID environment variables are required',
    );
  }

  return new AIGatewayClient(
    {
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      gatewayId: env.AI_GATEWAY_ID,
      provider: 'openai',
    },
    env.OPENAI_API_KEY,
  );
}
