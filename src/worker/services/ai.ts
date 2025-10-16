/**
 * Cloudflare AI Gateway Integration
 * 
 * This service provides OpenAI integration through Cloudflare AI Gateway
 * for improved observability, caching, and rate limiting.
 */

import { Env } from '../types';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: AIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIService {
  private env: Env;
  private gatewayUrl: string;

  constructor(env: Env) {
    this.env = env;
    this.gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openai`;
  }

  /**
   * Create a chat completion using OpenAI through Cloudflare AI Gateway
   */
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI Gateway error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Service error:', error);
      throw new Error(
        `Failed to create chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI Gateway error: ${response.status} - ${error}`);
      }

      return response.body as ReadableStream;
    } catch (error) {
      console.error('AI Service streaming error:', error);
      throw new Error(
        `Failed to create streaming chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate text embeddings using OpenAI
   */
  async createEmbedding(
    input: string | string[],
    model = 'text-embedding-ada-002'
  ): Promise<{ data: { embedding: number[]; index: number }[] }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input, model }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI Gateway error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Service embedding error:', error);
      throw new Error(
        `Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate an image using DALL-E
   */
  async generateImage(
    prompt: string,
    options?: {
      model?: string;
      size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
      n?: number;
    }
  ): Promise<{ data: { url: string }[] }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          model: options?.model || 'dall-e-3',
          size: options?.size || '1024x1024',
          quality: options?.quality || 'standard',
          n: options?.n || 1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI Gateway error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Service image generation error:', error);
      throw new Error(
        `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
