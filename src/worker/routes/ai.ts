/**
 * AI Gateway Routes
 * Example API routes demonstrating AI Gateway integration
 */

import type { Context } from '../types';
import { successResponse, errorResponse, badRequestResponse } from '../utils/response';
import { createAIGateway } from '../services/ai-gateway';
import type { ChatMessage } from '../services/ai-gateway';

/**
 * POST /api/ai/chat
 * Chat completion endpoint
 */
export async function chatCompletion(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.request.json<{
      messages: ChatMessage[];
      temperature?: number;
      max_tokens?: number;
    }>();

    if (!body.messages || !Array.isArray(body.messages)) {
      return badRequestResponse('Messages array is required');
    }

    const aiGateway = createAIGateway(ctx.env);
    const result = await aiGateway.chatCompletion({
      messages: body.messages,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || 1000,
    });

    return successResponse(result);
  } catch (error) {
    console.error('Chat completion error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to complete chat',
      500
    );
  }
}

/**
 * POST /api/ai/embeddings
 * Generate embeddings endpoint
 */
export async function generateEmbeddings(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.request.json<{
      input: string | string[];
      model?: string;
    }>();

    if (!body.input) {
      return badRequestResponse('Input is required');
    }

    const aiGateway = createAIGateway(ctx.env);
    const embeddings = await aiGateway.generateEmbeddings(
      body.input,
      body.model
    );

    return successResponse({ embeddings });
  } catch (error) {
    console.error('Embeddings generation error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to generate embeddings',
      500
    );
  }
}

/**
 * POST /api/ai/stream
 * Streaming chat completion endpoint
 */
export async function streamChatCompletion(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.request.json<{
      messages: ChatMessage[];
      temperature?: number;
      max_tokens?: number;
    }>();

    if (!body.messages || !Array.isArray(body.messages)) {
      return badRequestResponse('Messages array is required');
    }

    const aiGateway = createAIGateway(ctx.env);
    const stream = await aiGateway.streamChatCompletion({
      messages: body.messages,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || 1000,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream chat completion error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to stream chat',
      500
    );
  }
}
