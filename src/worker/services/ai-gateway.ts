import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../types/ai';
import type { Env } from '../types/env';
import { createLogger } from '../utils/logger';
import { AIGatewayError } from '../utils/errors';

const logger = createLogger('AIGateway');

/**
 * AI Gateway service for OpenAI integration via Cloudflare AI Gateway
 * Provides caching, rate limiting, and analytics for AI API calls
 */
export class AIGatewayService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly env: Env;

  constructor(env: Env) {
    this.env = env;
    this.apiKey = env.OPENAI_API_KEY;
    // Cloudflare AI Gateway URL format
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ID}/openai`;
  }

  /**
   * Create a chat completion
   * @param request Chat completion request parameters
   * @returns Chat completion response or stream
   */
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | ReadableStream> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest<ChatCompletionResponse>(
        '/chat/completions',
        request
      );

      // Track analytics
      await this.trackUsage('chat_completion', {
        model: request.model,
        latency: Date.now() - startTime,
        streaming: request.stream || false,
      });

      // Handle streaming response
      if (request.stream && response instanceof ReadableStream) {
        return response;
      }

      return response as ChatCompletionResponse;
    } catch (error) {
      logger.error('Chat completion failed', { error, request });
      throw new AIGatewayError('Failed to create chat completion', error);
    }
  }

  /**
   * Create embeddings for text input
   * @param request Embedding request parameters
   * @returns Embedding vectors
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest<EmbeddingResponse>('/embeddings', request);

      await this.trackUsage('embedding', {
        model: request.model,
        latency: Date.now() - startTime,
        input_count: Array.isArray(request.input) ? request.input.length : 1,
      });

      return response;
    } catch (error) {
      logger.error('Embedding creation failed', { error, request });
      throw new AIGatewayError('Failed to create embedding', error);
    }
  }

  /**
   * Generate images from text prompts
   * @param request Image generation request parameters
   * @returns Generated image URLs or base64 data
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest<ImageGenerationResponse>(
        '/images/generations',
        request
      );

      await this.trackUsage('image_generation', {
        size: request.size,
        quality: request.quality,
        latency: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      logger.error('Image generation failed', { error, request });
      throw new AIGatewayError('Failed to generate image', error);
    }
  }

  /**
   * Make a request to OpenAI via AI Gateway
   * @private
   */
  private async makeRequest<T>(
    endpoint: string,
    body: Record<string, any>
  ): Promise<T | ReadableStream> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'CF-AI-Gateway': this.env.AI_GATEWAY_ID,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `AI Gateway request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    // Handle streaming responses
    if (body.stream && response.body) {
      return response.body;
    }

    return response.json();
  }

  /**
   * Track AI Gateway usage in Analytics Engine
   * @private
   */
  private async trackUsage(
    operationType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: [operationType, this.env.ENVIRONMENT],
          doubles: [metadata.latency || 0],
          indexes: [new Date().toISOString()],
        });
      }
    } catch (error) {
      logger.warn('Failed to track AI usage', { error });
      // Don't throw - analytics failure shouldn't break the request
    }
  }
}

/**
 * Helper function to create a streaming chat completion
 */
export async function* streamChatCompletion(
  stream: ReadableStream
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            logger.warn('Failed to parse streaming chunk', { line, error: e });
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
