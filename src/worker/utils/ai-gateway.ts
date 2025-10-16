/**
 * AI Gateway Utility
 * Cloudflare AI Gateway integration with OpenAI
 */

import type { Env } from '../types/env.types';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  AIGatewayException,
  ChatMessage,
} from '../types/ai-gateway.types';
import { logError, logInfo } from './logger';

// ===========================================
// AI Gateway Client
// ===========================================

export class AIGatewayClient {
  private accountId: string;
  private gatewayId: string;
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(env: Env) {
    this.accountId = env.AI_GATEWAY_ID.split('/')[0] || '';
    this.gatewayId = env.AI_GATEWAY_ID.split('/')[1] || env.AI_GATEWAY_ID;
    this.apiKey = env.OPENAI_API_KEY;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.accountId}/${this.gatewayId}/openai`;
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
    userId?: string
  ): Promise<ChatCompletionResponse> {
    const requestId = crypto.randomUUID();

    logInfo('AI Gateway: Creating chat completion', {
      requestId,
      userId,
      model: request.model,
      messageCount: request.messages.length,
    });

    const response = await this.makeRequest<ChatCompletionResponse>(
      '/chat/completions',
      request,
      requestId
    );

    logInfo('AI Gateway: Chat completion successful', {
      requestId,
      tokensUsed: response.usage.total_tokens,
    });

    return response;
  }

  /**
   * Create embeddings
   */
  async createEmbedding(
    request: EmbeddingRequest,
    userId?: string
  ): Promise<EmbeddingResponse> {
    const requestId = crypto.randomUUID();

    logInfo('AI Gateway: Creating embedding', {
      requestId,
      userId,
      model: request.model,
      inputType: typeof request.input,
    });

    const response = await this.makeRequest<EmbeddingResponse>(
      '/embeddings',
      request,
      requestId
    );

    logInfo('AI Gateway: Embedding successful', {
      requestId,
      tokensUsed: response.usage.total_tokens,
    });

    return response;
  }

  /**
   * Stream chat completion (Server-Sent Events)
   */
  async streamChatCompletion(
    request: ChatCompletionRequest,
    userId?: string
  ): Promise<Response> {
    const requestId = crypto.randomUUID();
    request.stream = true;

    logInfo('AI Gateway: Streaming chat completion', {
      requestId,
      userId,
      model: request.model,
    });

    const url = `${this.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleError(response, requestId);
    }

    return response;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    body: any,
    requestId: string,
    attempt = 1
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response, requestId);
      }

      return await response.json<T>();
    } catch (error: any) {
      // Retry on network errors or timeouts
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        logInfo(`AI Gateway: Retrying request (attempt ${attempt + 1})`, {
          requestId,
          error: error.message,
        });

        await this.sleep(this.retryDelay * attempt);
        return this.makeRequest<T>(endpoint, body, requestId, attempt + 1);
      }

      logError('AI Gateway: Request failed', error, { requestId, attempt });
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response, requestId: string): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: any;

    try {
      errorDetails = await response.json();
      errorMessage = errorDetails.error?.message || errorMessage;
    } catch {
      // Unable to parse error response
    }

    logError('AI Gateway: API error', new Error(errorMessage), {
      requestId,
      status: response.status,
      details: errorDetails,
    });

    throw {
      message: errorMessage,
      statusCode: response.status,
      errorType: errorDetails?.error?.type || 'api_error',
      details: errorDetails,
    } as AIGatewayException;
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(error: any): boolean {
    // Retry on network errors and timeouts
    return (
      error.name === 'AbortError' ||
      error.message?.includes('network') ||
      error.message?.includes('timeout')
    );
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Create a simple chat completion
 */
export async function chat(
  env: Env,
  messages: ChatMessage[],
  options?: Partial<ChatCompletionRequest>
): Promise<string> {
  const client = new AIGatewayClient(env);

  const request: ChatCompletionRequest = {
    model: options?.model || env.AI_DEFAULT_MODEL,
    messages,
    temperature: options?.temperature || parseFloat(env.AI_DEFAULT_TEMPERATURE),
    ...options,
  };

  const response = await client.createChatCompletion(request);
  return response.choices[0]?.message?.content || '';
}

/**
 * Create embeddings for text
 */
export async function embed(
  env: Env,
  input: string | string[],
  model = 'text-embedding-3-small'
): Promise<number[][]> {
  const client = new AIGatewayClient(env);

  const request: EmbeddingRequest = {
    model,
    input,
  };

  const response = await client.createEmbedding(request);
  return response.data.map(d => d.embedding);
}

/**
 * Simple one-shot completion
 */
export async function complete(
  env: Env,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  return chat(env, messages);
}

/**
 * Estimate cost of tokens
 * Prices as of 2024 - update as needed
 */
export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 0.005 / 1000, completion: 0.015 / 1000 },
    'gpt-4o-mini': { prompt: 0.00015 / 1000, completion: 0.0006 / 1000 },
    'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
    'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
    'gpt-3.5-turbo': { prompt: 0.0005 / 1000, completion: 0.0015 / 1000 },
  };

  const price = pricing[model] || pricing['gpt-4o-mini'];
  return promptTokens * price.prompt + completionTokens * price.completion;
}
