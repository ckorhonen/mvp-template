/**
 * AI API Routes
 * 
 * Handles all AI-related API endpoints:
 * - Chat completions
 * - Embeddings
 * - Streaming responses
 * - Model listing
 */

import { AIService } from '../services/ai';
import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { validateRequest } from '../utils/validation';
import { authenticateRequest } from '../utils/auth';

/**
 * Handle POST /api/ai/chat - Chat completion
 */
export async function handleChatCompletion(
  request: Request,
  env: Env,
  aiService: AIService
): Promise<Response> {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request, env);
    if (!auth.success) {
      return errorResponse(auth.error || 'Unauthorized', 401);
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateRequest(body, {
      messages: { type: 'array', required: true },
      model: { type: 'string', required: false },
      temperature: { type: 'number', required: false },
      maxTokens: { type: 'number', required: false },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors?.join(', ') || 'Invalid request', 400);
    }

    // Call AI service
    const response = await aiService.chatCompletion(
      {
        messages: body.messages,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        topP: body.topP,
        frequencyPenalty: body.frequencyPenalty,
        presencePenalty: body.presencePenalty,
        stop: body.stop,
      },
      {
        userId: auth.userId,
        metadata: { apiKey: auth.apiKey },
      }
    );

    return jsonResponse(response);
  } catch (error) {
    logger.error('Chat completion endpoint error', { error });
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * Handle POST /api/ai/stream - Streaming chat completion
 */
export async function handleChatStream(
  request: Request,
  env: Env,
  aiService: AIService
): Promise<Response> {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request, env);
    if (!auth.success) {
      return errorResponse(auth.error || 'Unauthorized', 401);
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateRequest(body, {
      messages: { type: 'array', required: true },
      model: { type: 'string', required: false },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors?.join(', ') || 'Invalid request', 400);
    }

    // Get stream from AI service
    const stream = await aiService.chatCompletionStream(
      {
        messages: body.messages,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
      },
      {
        userId: auth.userId,
        metadata: { apiKey: auth.apiKey },
      }
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Chat stream endpoint error', { error });
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * Handle POST /api/ai/embeddings - Create embeddings
 */
export async function handleEmbeddings(
  request: Request,
  env: Env,
  aiService: AIService
): Promise<Response> {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request, env);
    if (!auth.success) {
      return errorResponse(auth.error || 'Unauthorized', 401);
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateRequest(body, {
      input: { type: ['string', 'array'], required: true },
      model: { type: 'string', required: false },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors?.join(', ') || 'Invalid request', 400);
    }

    // Call AI service
    const response = await aiService.createEmbedding(
      {
        input: body.input,
        model: body.model,
        encodingFormat: body.encodingFormat,
      },
      {
        userId: auth.userId,
        metadata: { apiKey: auth.apiKey },
      }
    );

    return jsonResponse(response);
  } catch (error) {
    logger.error('Embeddings endpoint error', { error });
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * Handle GET /api/ai/models - List available models
 */
export async function handleListModels(): Promise<Response> {
  const models = {
    chat: [
      { id: 'gpt-4o', description: 'Most capable GPT-4 model' },
      { id: 'gpt-4o-mini', description: 'Affordable and intelligent small model' },
      { id: 'gpt-4-turbo', description: 'Previous generation GPT-4 Turbo' },
    ],
    embeddings: [
      { id: 'text-embedding-3-large', description: 'Most capable embedding model' },
      { id: 'text-embedding-3-small', description: 'Efficient embedding model' },
      { id: 'text-embedding-ada-002', description: 'Legacy embedding model' },
    ],
  };

  return jsonResponse(models);
}
