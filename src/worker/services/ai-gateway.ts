/**
 * Cloudflare AI Gateway Service
 * Integrates with OpenAI through Cloudflare AI Gateway for caching and monitoring
 */

import { Env } from '../types';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
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

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<AIMessage>;
    finish_reason: string | null;
  }>;
}

export class AIGatewayService {
  private env: Env;
  private baseUrl: string;
  private apiKey: string;

  constructor(env: Env) {
    this.env = env;
    this.apiKey = env.OPENAI_API_KEY;

    // Construct AI Gateway URL
    // Format: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai
    if (env.AI_GATEWAY_ID && env.CLOUDFLARE_ACCOUNT_ID) {
      this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openai`;
    } else {
      // Fallback to direct OpenAI API
      this.baseUrl = 'https://api.openai.com/v1';
    }
  }

  /**
   * Simple completion helper - wrapper for chat completion
   */
  async complete(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
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

    const response = await this.createChatCompletion({
      model: options?.model || this.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    return response.choices[0]?.message.content || '';
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: options.model || this.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: options.messages,
    };

    // Add optional parameters
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }
    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }
    if (options.frequencyPenalty !== undefined) {
      body.frequency_penalty = options.frequencyPenalty;
    }
    if (options.presencePenalty !== undefined) {
      body.presence_penalty = options.presencePenalty;
    }
    if (options.user !== undefined) {
      body.user = options.user;
    }
    if (options.stream) {
      body.stream = true;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingCompletion(
    options: ChatCompletionOptions
  ): Promise<ReadableStream> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: options.model || this.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: options.messages,
      stream: true,
    };

    // Add optional parameters
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }
    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  }

  /**
   * Create embeddings for text
   */
  async createEmbeddings(
    input: string | string[],
    model = 'text-embedding-3-small'
  ): Promise<{
    object: string;
    data: Array<{ object: string; embedding: number[]; index: number }>;
    model: string;
    usage: { prompt_tokens: number; total_tokens: number };
  }> {
    const url = `${this.baseUrl}/embeddings`;

    const response = await fetch(url, {
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
      const error = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * List available models
   */
  async listModels(): Promise<{
    object: string;
    data: Array<{
      id: string;
      object: string;
      created: number;
      owned_by: string;
    }>;
  }> {
    const url = `${this.baseUrl}/models`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

/**
 * Factory function to create AI Gateway service
 */
export function createAIGateway(env: Env): AIGatewayService {
  return new AIGatewayService(env);
}
