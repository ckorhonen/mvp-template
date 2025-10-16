/**
 * Cloudflare AI Gateway Integration
 * Provides OpenAI API integration through Cloudflare AI Gateway for caching,
 * rate limiting, and cost optimization.
 */

import type { Env } from '../types';

export interface AIGatewayConfig {
  accountId: string;
  gatewayId: string;
  provider: 'openai' | 'anthropic' | 'huggingface' | 'replicate';
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenAIChatResponse {
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

export class AIGatewayClient {
  private baseUrl: string;
  private apiKey: string;
  private config: AIGatewayConfig;

  constructor(env: Env, config?: Partial<AIGatewayConfig>) {
    this.config = {
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      gatewayId: env.AI_GATEWAY_ID,
      provider: 'openai',
      ...config,
    };

    this.apiKey = env.OPENAI_API_KEY;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}/${this.config.provider}`;
  }

  /**
   * Send a chat completion request through AI Gateway
   */
  async chatCompletion(
    request: OpenAIChatRequest
  ): Promise<OpenAIChatResponse> {
    try {
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
          `AI Gateway request failed: ${response.status} ${error}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('AI Gateway error:', error);
      throw error;
    }
  }

  /**
   * Generate text from a simple prompt
   */
  async generateText(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      system?: string;
    }
  ): Promise<string> {
    const messages: OpenAIMessage[] = [];

    if (options?.system) {
      messages.push({
        role: 'system',
        content: options.system,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.chatCompletion({
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Stream chat completion responses
   */
  async streamChatCompletion(
    request: OpenAIChatRequest
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway streaming failed: ${response.status}`);
    }

    return response.body!;
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(
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
      throw new Error(`Embeddings generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

/**
 * Helper function to create AI Gateway client
 */
export function createAIGatewayClient(
  env: Env,
  config?: Partial<AIGatewayConfig>
): AIGatewayClient {
  return new AIGatewayClient(env, config);
}
