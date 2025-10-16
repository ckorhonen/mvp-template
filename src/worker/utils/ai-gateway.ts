/**
 * Cloudflare AI Gateway integration utilities
 * Provides OpenAI integration through Cloudflare AI Gateway with caching and rate limiting
 */

import type { Env } from '../types';
import { ExternalServiceError } from './errors';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: unknown;
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI Gateway client for OpenAI
 */
export class AIGatewayClient {
  private gatewayUrl: string;
  private apiKey: string;

  constructor(env: Env) {
    if (!env.AI_GATEWAY_ID || !env.OPENAI_API_KEY) {
      throw new Error('AI_GATEWAY_ID and OPENAI_API_KEY must be configured');
    }
    
    // Construct AI Gateway URL: gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai
    this.gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openai`;
    this.apiKey = env.OPENAI_API_KEY;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: OpenAICompletionRequest,
    options?: { cache?: boolean; cacheTtl?: number }
  ): Promise<OpenAICompletionResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      // Add cache headers if requested
      if (options?.cache) {
        headers['cf-aig-cache-ttl'] = String(options.cacheTtl || 3600);
      }

      const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ExternalServiceError('OpenAI', {
          status: response.status,
          error,
        });
      }

      return await response.json() as OpenAICompletionResponse;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('OpenAI', error);
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    request: OpenAICompletionRequest
  ): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ExternalServiceError('OpenAI', {
          status: response.status,
          error,
        });
      }

      if (!response.body) {
        throw new ExternalServiceError('OpenAI', 'No response body');
      }

      return response.body;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('OpenAI', error);
    }
  }

  /**
   * Simple text completion helper
   */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      cache?: boolean;
    }
  ): Promise<string> {
    const messages: OpenAIMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.createChatCompletion(
      {
        model: options?.model || 'gpt-3.5-turbo',
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 500,
      },
      { cache: options?.cache }
    );

    return response.choices[0]?.message?.content || '';
  }
}

/**
 * Helper to create AI Gateway client
 */
export function createAIGatewayClient(env: Env): AIGatewayClient {
  return new AIGatewayClient(env);
}
