/**
 * AI Gateway Routes
 * Handles AI-related API endpoints
 */

import { Env } from '../types';
import { createAIGateway, AIMessage } from '../services/ai-gateway';
import { successResponse, errorResponse } from '../utils/response';
import { validateRequest } from '../utils/validation';

/**
 * POST /api/ai/chat - Simple chat completion
 */
export async function handleChatCompletion(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Validate request body
    const body = await request.json();
    const validation = validateRequest(body, {
      message: { type: 'string', required: true, minLength: 1 },
      systemPrompt: { type: 'string', required: false },
      temperature: { type: 'number', required: false, min: 0, max: 2 },
      maxTokens: { type: 'number', required: false, min: 1, max: 4096 },
      model: { type: 'string', required: false },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const { message, systemPrompt, temperature, maxTokens, model } = body;

    // Create AI Gateway service
    const ai = createAIGateway(env);

    // Get completion
    const completion = await ai.complete(message, {
      systemPrompt,
      temperature,
      maxTokens,
      model,
    });

    return successResponse({
      response: completion,
      metadata: {
        model: model || env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI chat completion error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process chat completion',
      500
    );
  }
}

/**
 * POST /api/ai/stream - Streaming chat completion
 */
export async function handleStreamingCompletion(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Validate request body
    const body = await request.json();
    const validation = validateRequest(body, {
      messages: { type: 'array', required: true },
      model: { type: 'string', required: false },
      temperature: { type: 'number', required: false, min: 0, max: 2 },
      maxTokens: { type: 'number', required: false, min: 1, max: 4096 },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const { messages, model, temperature, maxTokens } = body;

    // Create AI Gateway service
    const ai = createAIGateway(env);

    // Get streaming response
    const stream = await ai.createStreamingCompletion({
      messages: messages as AIMessage[],
      model,
      temperature,
      maxTokens,
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI streaming error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process streaming completion',
      500
    );
  }
}

/**
 * POST /api/ai/embeddings - Create text embeddings
 */
export async function handleEmbeddings(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Validate request body
    const body = await request.json();
    const validation = validateRequest(body, {
      input: { type: ['string', 'array'], required: true },
      model: { type: 'string', required: false },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const { input, model } = body;

    // Create AI Gateway service
    const ai = createAIGateway(env);

    // Create embeddings
    const embeddings = await ai.createEmbeddings(input, model);

    return successResponse(embeddings);
  } catch (error) {
    console.error('AI embeddings error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create embeddings',
      500
    );
  }
}

/**
 * GET /api/ai/models - List available models
 */
export async function handleListModels(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Create AI Gateway service
    const ai = createAIGateway(env);

    // List models
    const models = await ai.listModels();

    return successResponse(models);
  } catch (error) {
    console.error('AI list models error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list models',
      500
    );
  }
}
