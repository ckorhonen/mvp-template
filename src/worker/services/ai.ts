/**
 * AI Service - OpenAI Integration via Cloudflare AI Gateway
 * 
 * This service provides a unified interface for AI operations using OpenAI's API
 * through Cloudflare's AI Gateway for caching, rate limiting, and cost tracking.
 */

import { Env } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIServiceConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'AI_ERROR',
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * AI Service Class
 * Handles all AI-related operations with built-in error handling and rate limiting
 */
export class AIService {
  private readonly gatewayUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;

  constructor(env: Env, config: AIServiceConfig = {}) {
    // Validate required environment variables
    if (!env.OPENAI_API_KEY) {
      throw new AIError('OPENAI_API_KEY not configured', 500, 'MISSING_API_KEY');
    }

    if (!env.AI_GATEWAY_ID) {
      throw new AIError('AI_GATEWAY_ID not configured', 500, 'MISSING_GATEWAY_ID');
    }

    // Construct AI Gateway URL
    const accountId = env.CLOUDFLARE_ACCOUNT_ID || 'YOUR_ACCOUNT_ID';
    this.gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${env.AI_GATEWAY_ID}/openai`;
    this.apiKey = env.OPENAI_API_KEY;

    // Set defaults
    this.defaultModel = config.model || 'gpt-4o-mini';
    this.defaultTemperature = config.temperature || 0.7;
    this.defaultMaxTokens = config.maxTokens || 1000;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: Partial<ChatCompletionRequest>,
  ): Promise<ChatCompletionResponse> {
    if (!request.messages || request.messages.length === 0) {
      throw new AIError('Messages are required', 400, 'INVALID_REQUEST');
    }

    const payload: ChatCompletionRequest = {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.max_tokens ?? this.defaultMaxTokens,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stream: false,
    };

    try {
      const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AIError(
          `OpenAI API error: ${error}`,
          response.status,
          'OPENAI_API_ERROR',
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      throw new AIError(
        `Failed to create chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'COMPLETION_ERROR',
      );
    }
  }

  /**
   * Generate a simple text completion
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionRequest>,
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.createChatCompletion({
      ...options,
      messages,
    });

    return response.choices[0]?.message.content || '';
  }

  /**
   * Generate embeddings for text
   */
  async createEmbedding(
    input: string | string[],
    model = 'text-embedding-3-small',
  ): Promise<number[][]> {
    try {
      const response = await fetch(`${this.gatewayUrl}/embeddings`, {
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
        throw new AIError(
          `OpenAI API error: ${error}`,
          response.status,
          'OPENAI_API_ERROR',
        );
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      throw new AIError(
        `Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'EMBEDDING_ERROR',
      );
    }
  }

  /**
   * Moderate content for safety
   */
  async moderateContent(input: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
  }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/moderations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AIError(
          `OpenAI API error: ${error}`,
          response.status,
          'OPENAI_API_ERROR',
        );
      }

      const data = await response.json();
      const result = data.results[0];

      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores,
      };
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      throw new AIError(
        `Failed to moderate content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'MODERATION_ERROR',
      );
    }
  }
}

/**
 * Helper function to create an AI service instance
 */
export function createAIService(env: Env, config?: AIServiceConfig): AIService {
  return new AIService(env, config);
}
