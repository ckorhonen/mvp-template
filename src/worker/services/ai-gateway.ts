/**
 * AI Gateway Service
 * Provides integration with Cloudflare AI Gateway and OpenAI
 * 
 * Features:
 * - Automatic caching via AI Gateway
 * - Rate limiting
 * - Error handling and retries
 * - Streaming support
 * - Multiple model support
 */

import type { Env } from '../types';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: AIMessage[];
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
    message: AIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIGatewayConfig {
  apiKey: string;
  gatewayId: string;
  accountId: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
}

export class AIGatewayError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AIGatewayError';
  }
}

/**
 * Creates an AI Gateway service instance
 */
export function createAIGateway(env: Env) {
  const config: AIGatewayConfig = {
    apiKey: env.OPENAI_API_KEY,
    gatewayId: env.AI_GATEWAY_ID,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    defaultModel: env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    defaultTemperature: parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7'),
    defaultMaxTokens: parseInt(env.AI_DEFAULT_MAX_TOKENS || '1000'),
    timeout: 30000, // 30 seconds
  };

  /**
   * Get the AI Gateway endpoint URL
   */
  function getEndpoint(): string {
    return `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/openai`;
  }

  /**
   * Make a request to the AI Gateway
   */
  async function makeRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout!);

    try {
      const response = await fetch(endpoint, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AIGatewayError(
          errorData.error?.message || `AI Gateway error: ${response.status}`,
          response.status,
          errorData.error?.code,
          errorData
        );
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new AIGatewayError('Request timeout', 408);
      }

      if (error instanceof AIGatewayError) {
        throw error;
      }

      throw new AIGatewayError(
        `Network error: ${error.message}`,
        500,
        'network_error',
        error
      );
    }
  }

  /**
   * Create a chat completion
   */
  async function createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const payload = {
      model: request.model || config.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? config.defaultTemperature,
      max_tokens: request.max_tokens ?? config.defaultMaxTokens,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stream: false,
    };

    const response = await makeRequest(`${getEndpoint()}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  /**
   * Create a streaming chat completion
   */
  async function createStreamingChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ReadableStream> {
    const payload = {
      model: request.model || config.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? config.defaultTemperature,
      max_tokens: request.max_tokens ?? config.defaultMaxTokens,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stream: true,
    };

    const response = await makeRequest(`${getEndpoint()}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.body) {
      throw new AIGatewayError('No response body', 500);
    }

    return response.body;
  }

  /**
   * Simple completion helper - wraps chat completion with a single user message
   */
  async function complete(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const messages: AIMessage[] = [];

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

    const response = await createChatCompletion({
      model: options?.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    return response.choices[0]?.message.content || '';
  }

  /**
   * List available models
   */
  async function listModels(): Promise<any> {
    const response = await makeRequest(`${getEndpoint()}/models`, {
      method: 'GET',
    });

    return response.json();
  }

  /**
   * Generate embeddings
   */
  async function createEmbedding(
    input: string | string[],
    model: string = 'text-embedding-ada-002'
  ): Promise<any> {
    const response = await makeRequest(`${getEndpoint()}/embeddings`, {
      method: 'POST',
      body: JSON.stringify({ input, model }),
    });

    return response.json();
  }

  return {
    createChatCompletion,
    createStreamingChatCompletion,
    complete,
    listModels,
    createEmbedding,
    config,
  };
}

export type AIGateway = ReturnType<typeof createAIGateway>;
