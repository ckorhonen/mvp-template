/**
 * AI Gateway API Routes
 * Examples of using Cloudflare AI Gateway with OpenAI
 */

import { Env } from '../types';
import { successResponse, errorResponse, ErrorResponses } from '../utils/response';
import { parseJsonBody, validateRequiredFields } from '../utils/validation';
import { createOpenAIClient } from '../utils/ai';
import { createLogger } from '../utils/logger';

/**
 * POST /api/ai/chat
 * Chat completion endpoint
 */
export async function handleChatCompletion(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'ai-chat');
  const origin = request.headers.get('Origin') || undefined;

  try {
    // Parse request body
    const body = await parseJsonBody<{
      message: string;
      systemPrompt?: string;
      model?: string;
      temperature?: number;
    }>(request);

    // Validate required fields
    const validation = validateRequiredFields(body, ['message']);
    if (!validation.valid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missing.join(', ')}`,
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Processing chat completion request', { messageLength: body.message.length });

    // Create OpenAI client
    const client = createOpenAIClient(env);

    // Generate response
    const response = await client.chat(
      body.message,
      body.systemPrompt,
      body.model || 'gpt-4o-mini',
      body.temperature || 0.7
    );

    logger.info('Chat completion successful');

    return successResponse(
      { response },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Chat completion error', error);
    return ErrorResponses.internalError(
      'Failed to generate chat completion',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * POST /api/ai/embed
 * Text embedding endpoint
 */
export async function handleEmbedding(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'ai-embed');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const body = await parseJsonBody<{
      text: string | string[];
      model?: string;
    }>(request);

    const validation = validateRequiredFields(body, ['text']);
    if (!validation.valid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missing.join(', ')}`,
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Processing embedding request');

    const client = createOpenAIClient(env);
    const embeddings = await client.embed(body.text, body.model);

    logger.info('Embedding generation successful');

    return successResponse(
      { embeddings },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Embedding error', error);
    return ErrorResponses.internalError(
      'Failed to generate embeddings',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * POST /api/ai/stream
 * Streaming chat completion endpoint
 */
export async function handleStreamingChat(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'ai-stream');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const body = await parseJsonBody<{
      message: string;
      systemPrompt?: string;
      model?: string;
    }>(request);

    const validation = validateRequiredFields(body, ['message']);
    if (!validation.valid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missing.join(', ')}`,
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Processing streaming chat request');

    const client = createOpenAIClient(env);
    const messages: any[] = [];

    if (body.systemPrompt) {
      messages.push({ role: 'system', content: body.systemPrompt });
    }
    messages.push({ role: 'user', content: body.message });

    const stream = await client.chatCompletionStream({
      model: body.model || 'gpt-4o-mini',
      messages,
      stream: true,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': origin || '*',
      },
    });
  } catch (error: any) {
    logger.error('Streaming chat error', error);
    return ErrorResponses.internalError(
      'Failed to start streaming',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}
