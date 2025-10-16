/**
 * Cloudflare AI Gateway integration with OpenAI
 */

import { Env, AIGatewayRequest, AIGatewayResponse, AppError } from '../types';
import { Logger } from './logger';

export class AIGateway {
  private baseUrl: string;
  private apiKey: string;
  private logger: Logger;

  constructor(env: Env, logger: Logger) {
    if (!env.AI_GATEWAY_ID || !env.OPENAI_API_KEY) {
      throw new AppError(
        'AI_GATEWAY_CONFIG_MISSING',
        'AI Gateway configuration is missing',
        500
      );
    }

    // Cloudflare AI Gateway URL format:
    // https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai
    this.baseUrl = env.AI_GATEWAY_URL || 
      `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ID}/openai`;
    this.apiKey = env.OPENAI_API_KEY;
    this.logger = logger;
  }

  async chat(
    request: AIGatewayRequest
  ): Promise<AIGatewayResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('AI Gateway chat request', {
        model: request.model,
        messages_count: request.messages.length,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('AI Gateway request failed', {
          status: response.status,
          error,
        });
        throw new AppError(
          'AI_GATEWAY_ERROR',
          `AI Gateway request failed: ${response.status}`,
          response.status,
          { error }
        );
      }

      const data: AIGatewayResponse = await response.json();
      const duration = Date.now() - startTime;
      
      this.logger.info('AI Gateway chat completed', {
        model: data.model,
        tokens: data.usage?.total_tokens,
        duration_ms: duration,
      });

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error('AI Gateway unexpected error', error);
      throw new AppError(
        'AI_GATEWAY_UNEXPECTED_ERROR',
        'An unexpected error occurred while calling AI Gateway',
        500,
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Helper method for simple text completions
   */
  async complete(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const messages: AIGatewayRequest['messages'] = [];
    
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

    const request: AIGatewayRequest = {
      model: options?.model || 'gpt-4o-mini',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    };

    const response = await this.chat(request);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Streaming chat completion
   */
  async streamChat(
    request: AIGatewayRequest
  ): Promise<ReadableStream> {
    this.logger.debug('AI Gateway streaming request', {
      model: request.model,
    });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(
        'AI_GATEWAY_STREAM_ERROR',
        `AI Gateway streaming failed: ${response.status}`,
        response.status,
        { error }
      );
    }

    return response.body!;
  }
}
