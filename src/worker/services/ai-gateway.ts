/**
 * Cloudflare AI Gateway Service
 * Provides integration with OpenAI through Cloudflare AI Gateway
 */

import { Env } from '../types/env';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../types/api';
import { AIGatewayError } from '../utils/errors';
import { Logger } from '../utils/logger';

export class AIGatewayService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger: Logger;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;

  constructor(env: Env) {
    this.apiKey = env.OPENAI_API_KEY;
    this.defaultModel = env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
    this.defaultTemperature = parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7');
    this.logger = new Logger(env);

    // Construct AI Gateway URL
    const accountId = env.AI_GATEWAY_ID.split('/')[0];
    const gatewayId = env.AI_GATEWAY_ID.split('/')[1];
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.max_tokens,
      stream: request.stream || false,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
    };

    try {
      const response = await this.makeRequest<ChatCompletionResponse>(url, body);
      this.logger.info('Chat completion created', {
        model: body.model,
        tokens: response.usage.total_tokens,
      });
      return response;
    } catch (error) {
      this.logger.error('Failed to create chat completion', { error });
      throw error;
    }
  }

  /**
   * Create embeddings
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const url = `${this.baseUrl}/embeddings`;

    const body = {
      model: request.model || 'text-embedding-3-small',
      input: request.input,
    };

    try {
      const response = await this.makeRequest<EmbeddingResponse>(url, body);
      this.logger.info('Embeddings created', {
        model: body.model,
        count: response.data.length,
      });
      return response;
    } catch (error) {
      this.logger.error('Failed to create embeddings', { error });
      throw error;
    }
  }

  /**
   * Generate images
   */
  async generateImage(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    const url = `${this.baseUrl}/images/generations`;

    const body = {
      model: request.model || 'dall-e-3',
      prompt: request.prompt,
      n: request.n || 1,
      size: request.size || '1024x1024',
      quality: request.quality || 'standard',
      style: request.style || 'vivid',
    };

    try {
      const response = await this.makeRequest<ImageGenerationResponse>(url, body);
      this.logger.info('Image generated', {
        model: body.model,
        count: response.data.length,
      });
      return response;
    } catch (error) {
      this.logger.error('Failed to generate image', { error });
      throw error;
    }
  }

  /**
   * Make an HTTP request to the AI Gateway with retry logic
   */
  private async makeRequest<T>(
    url: string,
    body: unknown,
    retries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new AIGatewayError(
            `AI Gateway request failed: ${response.status}`,
            response.status,
            { body: errorBody }
          );
        }

        return await response.json<T>();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`AI Gateway request failed (attempt ${attempt + 1}/${retries})`, {
          error: lastError.message,
        });

        if (attempt < retries - 1) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError || new Error('Unknown error in AI Gateway request');
  }

  /**
   * Stream chat completion (for Server-Sent Events)
   */
  async streamChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ReadableStream> {
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.max_tokens,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIGatewayError(
        `AI Gateway stream request failed: ${response.status}`,
        response.status,
        { body: errorBody }
      );
    }

    return response.body as ReadableStream;
  }
}
