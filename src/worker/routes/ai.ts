/**
 * AI Gateway Routes
 * Handles all AI-related API endpoints
 */

import type { Env } from '../types';
import { createAIGateway } from '../services/ai-gateway';
import { jsonResponse, errorResponse } from '../utils/response';
import type { ChatMessage } from '../services/ai-gateway';

/**
 * POST /api/ai/chat
 * Simple chat completion endpoint
 */
export async function handleAIChat(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as {
      message: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
    };

    if (!body.message) {
      return errorResponse('Message is required', 400);
    }

    const ai = createAIGateway(env);
    const response = await ai.complete(body.message, {
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      model: body.model,
    });

    return jsonResponse({
      success: true,
      data: {
        response,
        model: body.model || env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process AI request',
      500
    );
  }
}

/**
 * POST /api/ai/completion
 * Full chat completion endpoint
 */
export async function handleAICompletion(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as {
      messages: ChatMessage[];
      model?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    };

    if (!body.messages || !Array.isArray(body.messages)) {
      return errorResponse('Messages array is required', 400);
    }

    const ai = createAIGateway(env);

    // Handle streaming
    if (body.stream) {
      const stream = await ai.createChatCompletionStream({
        model: body.model || env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        stream: true,
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming completion
    const completion = await ai.createChatCompletion({
      model: body.model || env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    });

    return jsonResponse({
      success: true,
      data: completion,
    });
  } catch (error) {
    console.error('AI completion error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process completion',
      500
    );
  }
}

/**
 * GET /api/ai/models
 * List available AI models
 */
export async function handleAIModels(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const ai = createAIGateway(env);
    const models = await ai.listModels();

    return jsonResponse({
      success: true,
      data: {
        models,
        default: env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      },
    });
  } catch (error) {
    console.error('AI models error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list models',
      500
    );
  }
}

/**
 * POST /api/ai/cached-chat
 * Cached chat completion endpoint
 */
export async function handleAICachedChat(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as {
      message: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
      cacheTTL?: number;
    };

    if (!body.message) {
      return errorResponse('Message is required', 400);
    }

    const ai = createAIGateway(env);
    const response = await ai.cachedComplete(body.message, {
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      model: body.model,
      cacheTTL: body.cacheTTL,
    });

    return jsonResponse({
      success: true,
      data: {
        response,
        cached: true,
        model: body.model || env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      },
    });
  } catch (error) {
    console.error('AI cached chat error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process cached chat',
      500
    );
  }
}
