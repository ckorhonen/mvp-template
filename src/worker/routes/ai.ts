/**
 * AI Gateway routes with OpenAI integration
 */

import type { Env } from '../types/env';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../types/models';
import { successResponse, errorResponse, validationError } from '../utils/response';
import { parseJsonBody, validateRequiredFields } from '../utils/validation';
import { ExternalApiError } from '../utils/errors';
import { createLogger } from '../utils/logger';

/**
 * Handle chat completion requests via AI Gateway
 */
export async function handleChatCompletion(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    // Parse request body
    const body = await parseJsonBody<Partial<ChatCompletionRequest>>(request);
    
    // Validate required fields
    const validation = validateRequiredFields(body, ['messages']);
    if (!validation.valid) {
      return validationError('Missing required fields', {
        missing: validation.missing,
      });
    }

    // Validate messages array
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return validationError('Messages must be a non-empty array');
    }

    // Prepare OpenAI request
    const openaiRequest: ChatCompletionRequest = {
      model: body.model || 'gpt-3.5-turbo',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1000,
      stream: body.stream ?? false,
    };

    logger.info('Sending chat completion request', {
      model: openaiRequest.model,
      messageCount: openaiRequest.messages.length,
    });

    // Call OpenAI via AI Gateway
    const response = await callOpenAI(
      '/v1/chat/completions',
      openaiRequest,
      env
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('OpenAI API error', { status: response.status, error });
      throw new ExternalApiError('OpenAI', `API returned ${response.status}`, {
        status: response.status,
        error,
      });
    }

    const data: ChatCompletionResponse = await response.json();
    
    logger.info('Chat completion successful', {
      tokensUsed: data.usage.total_tokens,
    });

    return successResponse(data);
  } catch (error) {
    logger.error('Chat completion failed', error);
    if (error instanceof ExternalApiError) {
      return errorResponse(error.toApiError(), error.statusCode);
    }
    throw error;
  }
}

/**
 * Handle embeddings generation via AI Gateway
 */
export async function handleEmbeddings(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const body = await parseJsonBody<{ input: string | string[]; model?: string }>(request);
    
    const validation = validateRequiredFields(body, ['input']);
    if (!validation.valid) {
      return validationError('Missing required fields', {
        missing: validation.missing,
      });
    }

    const embeddingsRequest = {
      model: body.model || 'text-embedding-ada-002',
      input: body.input,
    };

    logger.info('Generating embeddings', {
      model: embeddingsRequest.model,
      inputType: Array.isArray(body.input) ? 'array' : 'string',
    });

    const response = await callOpenAI(
      '/v1/embeddings',
      embeddingsRequest,
      env
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('OpenAI embeddings error', { status: response.status, error });
      throw new ExternalApiError('OpenAI', `API returned ${response.status}`, {
        status: response.status,
        error,
      });
    }

    const data = await response.json();
    
    logger.info('Embeddings generated successfully');

    return successResponse(data);
  } catch (error) {
    logger.error('Embeddings generation failed', error);
    if (error instanceof ExternalApiError) {
      return errorResponse(error.toApiError(), error.statusCode);
    }
    throw error;
  }
}

/**
 * Call OpenAI API via AI Gateway (if configured) or directly
 */
async function callOpenAI(
  endpoint: string,
  body: any,
  env: Env
): Promise<Response> {
  // Use AI Gateway if configured, otherwise call OpenAI directly
  const baseUrl = env.AI_GATEWAY_URL
    ? `${env.AI_GATEWAY_URL}/${env.AI_GATEWAY_ID}/openai`
    : 'https://api.openai.com';

  const url = `${baseUrl}${endpoint}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Get AI Gateway analytics (if using Cloudflare AI Gateway)
 */
export async function handleAIAnalytics(
  request: Request,
  env: Env
): Promise<Response> {
  // This would require additional Cloudflare AI Gateway API integration
  // For now, return a placeholder
  return successResponse({
    message: 'AI Gateway analytics endpoint',
    note: 'Implement AI Gateway analytics API integration here',
  });
}
