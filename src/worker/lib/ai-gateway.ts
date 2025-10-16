/**
 * Cloudflare AI Gateway Integration
 * 
 * Provides a unified interface for interacting with AI models through Cloudflare's AI Gateway.
 * Supports multiple providers (OpenAI, Anthropic, etc.) with automatic retry logic,
 * rate limiting, and error handling.
 * 
 * @see https://developers.cloudflare.com/ai-gateway/
 */

import type { Env } from '../types';

// ==================== Types ====================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: AIMessage;
    finish_reason: string;
  }>;
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

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  apiKey: string;
  provider?: 'openai' | 'anthropic' | 'cohere';
  maxRetries?: number;
  retryDelay?: number;
}

export interface AIError {
  message: string;
  type: string;
  code?: string;
  status?: number;
}

// ==================== Constants ====================

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // ms
const DEFAULT_TIMEOUT = 30000; // 30 seconds

const AI_MODELS = {
  GPT4_TURBO: 'gpt-4-turbo-preview',
  GPT4: 'gpt-4',
  GPT35_TURBO: 'gpt-3.5-turbo',
  EMBEDDING_ADA: 'text-embedding-ada-002',
  EMBEDDING_3_SMALL: 'text-embedding-3-small',
  EMBEDDING_3_LARGE: 'text-embedding-3-large',
} as const;

// ==================== Main Class ====================

/**
 * AI Gateway Client
 * 
 * Handles all interactions with the Cloudflare AI Gateway, providing
 * a clean interface for chat completions, embeddings, and other AI operations.
 */
export class AIGateway {
  private config: Required<AIGatewayConfig>;
  private baseUrl: string;

  constructor(config: AIGatewayConfig) {
    this.config = {
      ...config,
      provider: config.provider || 'openai',
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
    };

    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}/${this.config.provider}`;
  }

  /**
   * Create a chat completion
   * 
   * @param request - Chat completion request parameters
   * @param signal - Optional AbortSignal for cancellation
   * @returns Chat completion response
   * 
   * @example
   * const response = await aiGateway.createChatCompletion({
   *   model: 'gpt-4-turbo-preview',
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: 'Hello!' }
   *   ]
   * });
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): Promise<ChatCompletionResponse> {
    return this.makeRequest<ChatCompletionResponse>(
      '/chat/completions',
      request,
      signal
    );
  }

  /**
   * Create a streaming chat completion
   * 
   * @param request - Chat completion request parameters
   * @param onChunk - Callback for each chunk received
   * @param signal - Optional AbortSignal for cancellation
   * 
   * @example
   * await aiGateway.createStreamingChatCompletion(
   *   { model: 'gpt-4', messages: [...], stream: true },
   *   (chunk) => console.log(chunk)
   * );
   */
  async createStreamingChatCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, stream: true }),
      signal,
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) onChunk(content);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Create embeddings for text
   * 
   * @param request - Embedding request parameters
   * @param signal - Optional AbortSignal for cancellation
   * @returns Embedding response with vectors
   * 
   * @example
   * const embeddings = await aiGateway.createEmbedding({
   *   model: 'text-embedding-ada-002',
   *   input: 'Hello, world!'
   * });
   */
  async createEmbedding(
    request: EmbeddingRequest,
    signal?: AbortSignal
  ): Promise<EmbeddingResponse> {
    return this.makeRequest<EmbeddingResponse>(
      '/embeddings',
      request,
      signal
    );
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    body: unknown,
    signal?: AbortSignal
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

        // Combine signals
        const combinedSignal = signal
          ? this.combineSignals([signal, controller.signal])
          : controller.signal;

        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleError(response);
        }

        return await response.json<T>();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) or if aborted
        if (
          error instanceof Error &&
          (error.name === 'AbortError' ||
            (error as AIError).status &&
            (error as AIError).status! >= 400 &&
            (error as AIError).status! < 500)
        ) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<AIError> {
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const error: AIError = {
      message: errorData.error?.message || errorData.message || 'Unknown error',
      type: errorData.error?.type || 'api_error',
      code: errorData.error?.code,
      status: response.status,
    };

    return error;
  }

  /**
   * Combine multiple AbortSignals
   */
  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== Helper Functions ====================

/**
 * Create an AI Gateway instance from environment variables
 * 
 * @param env - Cloudflare Worker environment bindings
 * @returns Configured AI Gateway instance
 */
export function createAIGateway(env: Env): AIGateway {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.AI_GATEWAY_ID || !env.OPENAI_API_KEY) {
    throw new Error('Missing required AI Gateway configuration');
  }

  return new AIGateway({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId: env.AI_GATEWAY_ID,
    apiKey: env.OPENAI_API_KEY,
    provider: 'openai',
  });
}

/**
 * Common prompt templates
 */
export const PromptTemplates = {
  /**
   * System prompt for a helpful assistant
   */
  HELPFUL_ASSISTANT: {
    role: 'system' as const,
    content: 'You are a helpful, harmless, and honest assistant. Always strive to provide accurate information and admit when you don\'t know something.',
  },

  /**
   * System prompt for code assistance
   */
  CODE_ASSISTANT: {
    role: 'system' as const,
    content: 'You are an expert programmer. Provide clear, well-documented code examples with explanations. Follow best practices and consider edge cases.',
  },

  /**
   * System prompt for JSON responses
   */
  JSON_RESPONDER: {
    role: 'system' as const,
    content: 'You always respond with valid JSON only. No markdown, no explanations, just pure JSON.',
  },
};

export { AI_MODELS };
