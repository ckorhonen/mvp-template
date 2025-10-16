// ===========================================
// AI Gateway Integration
// OpenAI integration via Cloudflare AI Gateway
// ===========================================

import type {
  Env,
  AIGatewayConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from '../types';
import { ApiError, ErrorCode } from '../types';
import { getLogger } from './logger';

const logger = getLogger('AIGateway');

/**
 * AI Gateway Client
 * Provides methods to interact with OpenAI via Cloudflare AI Gateway
 */
export class AIGatewayClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultConfig: AIGatewayConfig;

  constructor(env: Env) {
    const gatewayId = env.AI_GATEWAY_ID;
    const accountId = 'your-account-id'; // TODO: Add account ID to env

    // Cloudflare AI Gateway URL format
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`;
    this.apiKey = env.OPENAI_API_KEY;

    this.defaultConfig = {
      gatewayId,
      model: env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7'),
    };
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
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || this.defaultConfig.model,
          messages: request.messages,
          temperature: request.temperature ?? this.defaultConfig.temperature,
          max_tokens: request.maxTokens,
          stream: request.stream || false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('OpenAI API error', { status: response.status, error });
        throw new ApiError(
          ErrorCode.INTERNAL_ERROR,
          'AI service error',
          response.status,
          error
        );
      }

      const data = await response.json<ChatCompletionResponse>();
      logger.info('Chat completion successful', {
        model: data.model,
        tokens: data.usage.totalTokens,
      });

      return data;
    } catch (error) {
      logger.error('Failed to create chat completion', { error });
      throw error instanceof ApiError
        ? error
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to generate response');
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || this.defaultConfig.model,
          messages: request.messages,
          temperature: request.temperature ?? this.defaultConfig.temperature,
          max_tokens: request.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('OpenAI streaming API error', {
          status: response.status,
          error,
        });
        throw new ApiError(
          ErrorCode.INTERNAL_ERROR,
          'AI service error',
          response.status
        );
      }

      return response.body!;
    } catch (error) {
      logger.error('Failed to create streaming chat completion', { error });
      throw error instanceof ApiError
        ? error
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to start streaming');
    }
  }

  /**
   * Simple prompt-based completion
   */
  async complete(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      temperature?: number;
    }
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.createChatCompletion({
      messages,
      model: options?.model,
      temperature: options?.temperature,
    });

    return response.choices[0].message.content;
  }

  /**
   * Create embeddings (if supported by your AI Gateway setup)
   */
  async createEmbedding(input: string | string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input,
        }),
      });

      if (!response.ok) {
        throw new ApiError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to create embeddings',
          response.status
        );
      }

      const data = await response.json<any>();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      logger.error('Failed to create embeddings', { error });
      throw error instanceof ApiError
        ? error
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Embedding generation failed');
    }
  }
}

/**
 * Utility function to create an AI Gateway client
 */
export function createAIGatewayClient(env: Env): AIGatewayClient {
  return new AIGatewayClient(env);
}

/**
 * Helper to build conversation context
 */
export function buildConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string
): ChatMessage[] {
  const conversation: ChatMessage[] = [];

  if (systemPrompt) {
    conversation.push({ role: 'system', content: systemPrompt });
  }

  conversation.push(...messages);

  return conversation;
}
