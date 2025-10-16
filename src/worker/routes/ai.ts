/**
 * AI Gateway route examples
 * Demonstrates OpenAI integration through Cloudflare AI Gateway
 */

import { z } from 'zod';
import type { Env } from '../types';
import { jsonResponse, errorResponse, streamResponse, errorResponses } from '../utils/response';
import { validateBody } from '../utils/validation';
import { createAIGatewayClient } from '../utils/ai-gateway';
import { toApiError } from '../utils/errors';

/**
 * Request schema for chat completion
 */
const chatCompletionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  model: z.string().default('gpt-3.5-turbo'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().positive().max(4000).optional(),
  stream: z.boolean().default(false),
});

/**
 * Simple completion schema
 */
const simpleCompletionSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  system_prompt: z.string().optional(),
  model: z.string().default('gpt-3.5-turbo'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().positive().max(4000).default(500),
  cache: z.boolean().default(true),
});

/**
 * POST /api/ai/chat - Create chat completion
 */
export async function handleChatCompletion(request: Request, env: Env): Promise<Response> {
  try {
    // Validate request body
    const validation = await validateBody(request, chatCompletionSchema);
    if (!validation.success) {
      return errorResponses.badRequest('Invalid request', { errors: validation.error });
    }

    const { messages, model, temperature, max_tokens, stream } = validation.data;

    // Create AI Gateway client
    const aiClient = createAIGatewayClient(env);

    // Handle streaming response
    if (stream) {
      const streamBody = await aiClient.createStreamingChatCompletion({
        model,
        messages,
        temperature,
        max_tokens,
      });

      return streamResponse(streamBody);
    }

    // Handle standard response
    const completion = await aiClient.createChatCompletion(
      {
        model,
        messages,
        temperature,
        max_tokens,
      },
      { cache: true, cacheTtl: 3600 }
    );

    return jsonResponse({
      message: completion.choices[0]?.message?.content || '',
      usage: completion.usage,
      model: completion.model,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponse(apiError.message, apiError.statusCode, apiError.code, apiError.details);
  }
}

/**
 * POST /api/ai/complete - Simple text completion
 */
export async function handleSimpleCompletion(request: Request, env: Env): Promise<Response> {
  try {
    const validation = await validateBody(request, simpleCompletionSchema);
    if (!validation.success) {
      return errorResponses.badRequest('Invalid request', { errors: validation.error });
    }

    const { prompt, system_prompt, model, temperature, max_tokens, cache } = validation.data;

    const aiClient = createAIGatewayClient(env);
    const response = await aiClient.complete(prompt, system_prompt, {
      model,
      temperature,
      maxTokens: max_tokens,
      cache,
    });

    return jsonResponse({ text: response });
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponse(apiError.message, apiError.statusCode, apiError.code, apiError.details);
  }
}

/**
 * GET /api/ai/models - List available models
 */
export async function handleListModels(): Promise<Response> {
  const models = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Latest GPT-4 with improved performance' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
  ];

  return jsonResponse({ models });
}
