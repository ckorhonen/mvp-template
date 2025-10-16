import { Env, AIGatewayRequest, AIGatewayResponse, WorkerError } from '../types';

/**
 * Cloudflare AI Gateway integration for OpenAI
 * https://developers.cloudflare.com/ai-gateway/
 */

export class AIGateway {
  private readonly baseUrl: string;

  constructor(
    private env: Env
  ) {
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openai`;
  }

  /**
   * Send a chat completion request through AI Gateway
   */
  async chatCompletion(
    request: AIGatewayRequest
  ): Promise<AIGatewayResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new WorkerError(
          `AI Gateway request failed: ${error}`,
          response.status,
          'AI_GATEWAY_ERROR',
          { response: error }
        );
      }

      return await response.json() as AIGatewayResponse;
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw new WorkerError(
        'Failed to communicate with AI Gateway',
        500,
        'AI_GATEWAY_CONNECTION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Send a streaming chat completion request
   */
  async chatCompletionStream(
    request: AIGatewayRequest
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new WorkerError(
        'AI Gateway streaming request failed',
        response.status,
        'AI_GATEWAY_STREAM_ERROR'
      );
    }

    return response.body!;
  }

  /**
   * Generate embeddings through AI Gateway
   */
  async createEmbedding(
    input: string | string[],
    model: string = 'text-embedding-ada-002'
  ): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input, model }),
    });

    if (!response.ok) {
      throw new WorkerError(
        'AI Gateway embeddings request failed',
        response.status,
        'AI_GATEWAY_EMBEDDINGS_ERROR'
      );
    }

    const data = await response.json() as any;
    return data.data.map((item: any) => item.embedding);
  }
}
