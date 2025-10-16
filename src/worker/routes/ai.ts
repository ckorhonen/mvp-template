/**
 * AI Gateway Routes
 * 
 * Example routes demonstrating AI Gateway integration with OpenAI.
 */

import type { Env } from '../types';
import { createAIGateway } from '../services/ai-gateway';
import { successResponse, errorResponse, serverErrorResponse } from '../utils/response';
import { parseAndValidateJSON, validateRequired } from '../utils/validation';

/**
 * POST /api/ai/chat
 * Create a chat completion
 */
export async function handleAIChat(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseAndValidateJSON<{
      message: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }>(request);

    const errors = validateRequired(body, ['message']);
    if (errors.length > 0) {
      return errorResponse('Validation failed', { details: errors });
    }

    const ai = createAIGateway(env);
    const response = await ai.complete(body.message, {
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    });

    return successResponse({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    return serverErrorResponse('Failed to generate AI response', error as Error);
  }
}

/**
 * POST /api/ai/stream
 * Create a streaming chat completion
 */
export async function handleAIStream(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseAndValidateJSON<{
      messages: { role: string; content: string }[];
      model?: string;
    }>(request);

    const errors = validateRequired(body, ['messages']);
    if (errors.length > 0) {
      return errorResponse('Validation failed', { details: errors });
    }

    const ai = createAIGateway(env);
    const stream = await ai.createStreamingChatCompletion({
      model: body.model || 'gpt-4o-mini',
      messages: body.messages as any,
    });

    return stream;
  } catch (error) {
    console.error('AI stream error:', error);
    return serverErrorResponse('Failed to generate AI stream', error as Error);
  }
}

/**
 * GET /api/ai/models
 * List available AI models
 */
export async function handleAIModels(_request: Request, _env: Env): Promise<Response> {
  return successResponse({
    models: [
      { id: 'gpt-4o', name: 'GPT-4 Optimized', description: 'Most capable model' },
      { id: 'gpt-4o-mini', name: 'GPT-4 Optimized Mini', description: 'Fast and efficient' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Cost-effective' },
    ],
  });
}
