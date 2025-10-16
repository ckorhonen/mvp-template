/**
 * AI Gateway Routes
 * Example endpoints showcasing AI Gateway integration
 */

import { createAIGatewayClient } from '../lib/ai-gateway';
import { jsonResponse, errorResponse, parseJSON } from '../lib/utils';
import type { Env } from '../types';

export async function handleAIRoutes(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Initialize AI Gateway client
  const aiClient = createAIGatewayClient(env);

  try {
    // POST /api/ai/chat - Chat completion
    if (path === '/api/ai/chat' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.message) {
        return errorResponse('Message is required', 400);
      }

      const response = await aiClient.chatCompletion({
        model: body.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: body.message,
          },
        ],
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 500,
      });

      return jsonResponse({
        message: response.choices[0]?.message?.content,
        usage: response.usage,
      });
    }

    // POST /api/ai/generate - Simple text generation
    if (path === '/api/ai/generate' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.prompt) {
        return errorResponse('Prompt is required', 400);
      }

      const text = await aiClient.generateText(body.prompt, {
        model: body.model,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        system: body.system,
      });

      return jsonResponse({ text });
    }

    // POST /api/ai/embeddings - Generate embeddings
    if (path === '/api/ai/embeddings' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.input) {
        return errorResponse('Input is required', 400);
      }

      const embeddings = await aiClient.generateEmbeddings(
        body.input,
        body.model
      );

      return jsonResponse({ embeddings });
    }

    // POST /api/ai/stream - Streaming chat
    if (path === '/api/ai/stream' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.message) {
        return errorResponse('Message is required', 400);
      }

      const stream = await aiClient.streamChatCompletion({
        model: body.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: body.message,
          },
        ],
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return errorResponse('Not found', 404);
  } catch (error) {
    console.error('AI route error:', error);
    return errorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}
