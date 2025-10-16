// ===========================================
// Cloudflare AI Gateway Integration
// OpenAI API integration through Cloudflare AI Gateway
// ===========================================

import type {
  Env,
  AIGatewayConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from '../types';
import { WorkerError } from '../types';
import { logger } from './logger';

/**
 * AI Gateway Client for OpenAI integration
 * Uses Cloudflare AI Gateway for caching, rate limiting, and analytics
 */
export class AIGatewayClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultConfig: AIGatewayConfig;

  constructor(env: Env) {
    const accountId = 'your-account-id'; // Should be in env
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${env.AI_GATEWAY_ID}/openai`;
    this.apiKey = env.OPENAI_API_KEY;
    this.defaultConfig = {
      gatewayId: env.AI_GATEWAY_ID,
      model: env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7'),
      maxTokens: 1000,
    };
  }

  /**
   * Send a chat completion request
   */
  async chatCompletion(
    messages: ChatMessage[],
    config?: Partial<AIGatewayConfig>
  ): Promise<ChatCompletionResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const requestBody: ChatCompletionRequest = {
      model: mergedConfig.model,
      messages,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      top_p: mergedConfig.topP,
      frequency_penalty: mergedConfig.frequencyPenalty,
      presence_penalty: mergedConfig.presencePenalty,
    };

    try {
      logger.debug('Sending chat completion request', {
        model: requestBody.model,
        messageCount: messages.length,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new WorkerError(
          'AI_GATEWAY_ERROR',
          `AI Gateway request failed: ${response.statusText}`,
          response.status,
          error
        );
      }

      const data: ChatCompletionResponse = await response.json();
      
      logger.debug('Chat completion successful', {
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
      });

      return data;
    } catch (error) {
      logger.error('Chat completion failed', { error });
      throw error;
    }
  }

  /**
   * Simple text completion helper
   */
  async complete(
    prompt: string,
    systemMessage?: string,
    config?: Partial<AIGatewayConfig>
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.chatCompletion(messages, config);
    return response.choices[0]?.message.content || '';
  }

  /**
   * Streaming chat completion
   */
  async streamChatCompletion(
    messages: ChatMessage[],
    config?: Partial<AIGatewayConfig>
  ): Promise<ReadableStream> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const requestBody: ChatCompletionRequest = {
      model: mergedConfig.model,
      messages,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new WorkerError(
        'AI_GATEWAY_ERROR',
        `AI Gateway streaming request failed: ${response.statusText}`,
        response.status
      );
    }

    return response.body!;
  }

  /**
   * Generate embeddings
   */
  async createEmbedding(
    input: string | string[],
    model: string = 'text-embedding-ada-002'
  ): Promise<number[][]> {
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
      throw new WorkerError(
        'AI_GATEWAY_ERROR',
        `Embedding request failed: ${response.statusText}`,
        response.status
      );
    }

    const data: any = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

/**
 * Create AI Gateway client instance
 */
export function createAIGatewayClient(env: Env): AIGatewayClient {
  return new AIGatewayClient(env);
}
