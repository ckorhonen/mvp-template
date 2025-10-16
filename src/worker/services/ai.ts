/**
 * Cloudflare AI Gateway Service
 * 
 * Provides integration with OpenAI through Cloudflare AI Gateway for:
 * - Chat completions
 * - Text embeddings
 * - Streaming responses
 * - Token usage tracking
 */

import { AIGatewayConfig, ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse } from '../types';
import { logger } from '../utils/logger';
import { AIServiceError, RateLimitError } from '../utils/errors';

export class AIService {
  private accountId: string;
  private gatewayId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AIGatewayConfig) {
    this.accountId = config.accountId;
    this.gatewayId = config.gatewayId;
    this.apiKey = config.apiKey;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.accountId}/${this.gatewayId}/openai`;
  }

  /**
   * Send a chat completion request to OpenAI via AI Gateway
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    options?: { userId?: string; metadata?: Record<string, unknown> }
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.makeRequest('/chat/completions', {
        model: request.model || 'gpt-4o-mini',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        stream: false,
      }, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new AIServiceError(
          `AI Gateway request failed: ${response.status} ${response.statusText}`,
          response.status,
          error
        );
      }

      const data = await response.json();
      
      logger.info('Chat completion successful', {
        model: request.model,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        userId: options?.userId,
      });

      return {
        id: data.id,
        object: data.object,
        created: data.created,
        model: data.model,
        choices: data.choices,
        usage: data.usage,
      };
    } catch (error) {
      logger.error('Chat completion failed', { error, request });
      throw error;
    }
  }

  /**
   * Stream chat completion responses
   */
  async chatCompletionStream(
    request: ChatCompletionRequest,
    options?: { userId?: string; metadata?: Record<string, unknown> }
  ): Promise<ReadableStream> {
    try {
      const response = await this.makeRequest('/chat/completions', {
        model: request.model || 'gpt-4o-mini',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true,
      }, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new AIServiceError(
          `AI Gateway streaming request failed: ${response.status}`,
          response.status,
          error
        );
      }

      logger.info('Chat completion stream started', {
        model: request.model,
        userId: options?.userId,
      });

      return response.body!;
    } catch (error) {
      logger.error('Chat completion stream failed', { error, request });
      throw error;
    }
  }

  /**
   * Generate text embeddings
   */
  async createEmbedding(
    request: EmbeddingRequest,
    options?: { userId?: string; metadata?: Record<string, unknown> }
  ): Promise<EmbeddingResponse> {
    try {
      const response = await this.makeRequest('/embeddings', {
        model: request.model || 'text-embedding-3-small',
        input: request.input,
        encoding_format: request.encodingFormat,
      }, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new AIServiceError(
          `Embedding request failed: ${response.status}`,
          response.status,
          error
        );
      }

      const data = await response.json();

      logger.info('Embedding created', {
        model: request.model,
        inputType: Array.isArray(request.input) ? 'array' : 'string',
        count: Array.isArray(request.input) ? request.input.length : 1,
        userId: options?.userId,
      });

      return {
        object: data.object,
        data: data.data,
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      logger.error('Embedding creation failed', { error, request });
      throw error;
    }
  }

  /**
   * Make a request to the AI Gateway
   */
  private async makeRequest(
    endpoint: string,
    body: Record<string, unknown>,
    options?: { userId?: string; metadata?: Record<string, unknown> }
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    // Add custom headers for tracking
    if (options?.userId) {
      headers['cf-aig-user-id'] = options.userId;
    }

    if (options?.metadata) {
      headers['cf-aig-metadata'] = JSON.stringify(options.metadata);
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      return await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      logger.error('AI Gateway request failed', { error, url, endpoint });
      throw new AIServiceError('Network request to AI Gateway failed', 0, error);
    }
  }

  /**
   * Check rate limits for a user
   */
  async checkRateLimit(userId: string, requestsPerMinute: number = 60): Promise<boolean> {
    // This would integrate with Durable Objects for rate limiting
    // Implementation depends on your rate limiting strategy
    return true;
  }
}

/**
 * Create an AI service instance from environment
 */
export function createAIService(env: {
  AI_GATEWAY_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  OPENAI_API_KEY: string;
}): AIService {
  return new AIService({
    accountId: env.AI_GATEWAY_ACCOUNT_ID,
    gatewayId: env.AI_GATEWAY_ID,
    apiKey: env.OPENAI_API_KEY,
  });
}
