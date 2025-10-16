/**
 * AI Gateway and OpenAI integration utilities
 */

import { Env, ChatCompletionRequest, EmbeddingRequest } from '../types';

/**
 * OpenAI Client with AI Gateway support
 */
export class OpenAIClient {
  private apiKey: string;
  private endpoint: string;

  constructor(env: Env) {
    this.apiKey = env.OPENAI_API_KEY;
    // Use AI Gateway endpoint if configured, otherwise use OpenAI directly
    this.endpoint = env.AI_GATEWAY_ENDPOINT || 'https://api.openai.com/v1';
  }

  /**
   * Create a chat completion
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<any> {
    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Chat completion error:', error);
      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async chatCompletionStream(request: ChatCompletionRequest): Promise<ReadableStream> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    return response.body!;
  }

  /**
   * Create embeddings
   */
  async createEmbedding(request: EmbeddingRequest): Promise<any> {
    try {
      const response = await fetch(`${this.endpoint}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate a simple chat response
   */
  async chat(
    userMessage: string,
    systemPrompt?: string,
    model: string = 'gpt-4o-mini',
    temperature: number = 0.7
  ): Promise<string> {
    const messages: ChatCompletionRequest['messages'] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await this.chatCompletion({
      model,
      messages,
      temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate embeddings for text
   */
  async embed(
    text: string | string[],
    model: string = 'text-embedding-3-small'
  ): Promise<number[][]> {
    const response = await this.createEmbedding({
      model,
      input: text,
    });

    return response.data.map((item: any) => item.embedding);
  }
}

/**
 * Create an OpenAI client instance
 */
export function createOpenAIClient(env: Env): OpenAIClient {
  return new OpenAIClient(env);
}

/**
 * Helper function to build a system prompt
 */
export function buildSystemPrompt(role: string, context?: string): string {
  let prompt = `You are ${role}.`;
  if (context) {
    prompt += ` ${context}`;
  }
  return prompt;
}

/**
 * Parse streaming SSE response
 */
export function parseSSEResponse(data: string): any {
  if (data.startsWith('data: ')) {
    const jsonStr = data.slice(6).trim();
    if (jsonStr === '[DONE]') return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
  return null;
}
