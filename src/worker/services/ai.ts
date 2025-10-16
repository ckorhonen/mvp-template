/**
 * Cloudflare AI Gateway Integration with OpenAI
 * 
 * This service provides OpenAI integration through Cloudflare AI Gateway,
 * offering caching, rate limiting, and cost optimization features.
 */

import { AIService, AIResponse, ChatCompletionRequest, EmbeddingRequest } from '../types';

/**
 * AI Gateway Configuration
 */
interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  openaiApiKey: string;
}

/**
 * Rate Limiter for AI calls
 */
class AIRateLimiter {
  private cache: KVNamespace;
  private readonly maxRequestsPerMinute: number;

  constructor(cache: KVNamespace, maxRequestsPerMinute = 60) {
    this.cache = cache;
    this.maxRequestsPerMinute = maxRequestsPerMinute;
  }

  async checkLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate_limit:ai:${userId}:${Math.floor(Date.now() / 60000)}`;
    const count = parseInt(await this.cache.get(key) || '0', 10);

    if (count >= this.maxRequestsPerMinute) {
      return { allowed: false, remaining: 0 };
    }

    await this.cache.put(key, (count + 1).toString(), { expirationTtl: 120 });
    return { allowed: true, remaining: this.maxRequestsPerMinute - count - 1 };
  }
}

/**
 * Cloudflare AI Gateway Service
 */
export class CloudflareAIService implements AIService {
  private config: AIGatewayConfig;
  private rateLimiter?: AIRateLimiter;
  private baseUrl: string;

  constructor(config: AIGatewayConfig, cache?: KVNamespace) {
    this.config = config;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/openai`;
    
    if (cache) {
      this.rateLimiter = new AIRateLimiter(cache);
    }
  }

  /**
   * Generate chat completion using OpenAI through Cloudflare AI Gateway
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<AIResponse> {
    try {
      // Check rate limit
      if (this.rateLimiter && request.userId) {
        const rateCheck = await this.rateLimiter.checkLimit(request.userId);
        if (!rateCheck.allowed) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            errorCode: 'RATE_LIMIT_EXCEEDED',
          };
        }
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: request.model || 'gpt-3.5-turbo',
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 500,
          top_p: request.topP,
          frequency_penalty: request.frequencyPenalty,
          presence_penalty: request.presencePenalty,
          user: request.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `AI Gateway request failed: ${response.status}`,
          errorCode: 'AI_GATEWAY_ERROR',
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          content: data.choices[0]?.message?.content || '',
          model: data.model,
          usage: data.usage,
          finishReason: data.choices[0]?.finish_reason,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Generate embeddings using OpenAI through Cloudflare AI Gateway
   */
  async embedding(request: EmbeddingRequest): Promise<AIResponse> {
    try {
      // Check rate limit
      if (this.rateLimiter && request.userId) {
        const rateCheck = await this.rateLimiter.checkLimit(request.userId);
        if (!rateCheck.allowed) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            errorCode: 'RATE_LIMIT_EXCEEDED',
          };
        }
      }

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: request.model || 'text-embedding-ada-002',
          input: request.input,
          user: request.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `AI Gateway request failed: ${response.status}`,
          errorCode: 'AI_GATEWAY_ERROR',
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          embeddings: data.data.map((item: any) => item.embedding),
          model: data.model,
          usage: data.usage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Stream chat completion (for real-time responses)
   */
  async streamChatCompletion(request: ChatCompletionRequest): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'gpt-3.5-turbo',
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 500,
        stream: true,
        user: request.userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway request failed: ${response.status}`);
    }

    return response.body!;
  }
}

/**
 * Factory function to create AI service instance
 */
export function createAIService(
  accountId: string,
  gatewayId: string,
  openaiApiKey: string,
  cache?: KVNamespace
): CloudflareAIService {
  return new CloudflareAIService(
    { accountId, gatewayId, openaiApiKey },
    cache
  );
}
