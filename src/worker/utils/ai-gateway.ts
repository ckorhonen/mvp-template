/**
 * AI Gateway Utility Functions
 * Helpers for interacting with Cloudflare AI Gateway and OpenAI
 */

import type {
  OpenAIConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../types/ai';

/**
 * Get the OpenAI API URL, optionally using AI Gateway
 */
export function getOpenAIUrl(
  config: OpenAIConfig,
  endpoint: string = 'chat/completions'
): string {
  if (config.gatewayId && config.accountId) {
    return `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/openai/${endpoint}`;
  }
  return `https://api.openai.com/v1/${endpoint}`;
}

/**
 * Create a chat completion using OpenAI through AI Gateway
 */
export async function createChatCompletion(
  config: OpenAIConfig,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const url = getOpenAIUrl(config, 'chat/completions');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create embeddings using OpenAI through AI Gateway
 */
export async function createEmbedding(
  config: OpenAIConfig,
  request: EmbeddingRequest
): Promise<EmbeddingResponse> {
  const url = getOpenAIUrl(config, 'embeddings');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Stream chat completion (for real-time responses)
 */
export async function streamChatCompletion(
  config: OpenAIConfig,
  request: ChatCompletionRequest
): Promise<ReadableStream> {
  const url = getOpenAIUrl(config, 'chat/completions');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  return response.body;
}
