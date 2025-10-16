/**
 * AI API Routes
 * 
 * Provides endpoints for AI functionality including chat completions and embeddings.
 */

import { CloudflareAIService } from '../services/ai';
import { corsHeaders, errorResponse, successResponse } from '../utils/responses';
import type { Env } from '../types';

/**
 * Handle AI chat completion requests
 */
export async function handleChatCompletion(
  request: Request,
  env: Env
): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await request.json();
    const { messages, model, temperature, maxTokens, userId } = body;

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('Invalid request: messages array is required', 400);
    }

    // Create AI service
    const aiService = new CloudflareAIService(
      {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        gatewayId: env.AI_GATEWAY_ID,
        openaiApiKey: env.OPENAI_API_KEY,
      },
      env.CACHE
    );

    // Make AI request
    const result = await aiService.chatCompletion({
      messages,
      model,
      temperature,
      maxTokens,
      userId: userId || 'anonymous',
    });

    if (!result.success) {
      return errorResponse(result.error || 'AI request failed', 500, {
        errorCode: result.errorCode,
      });
    }

    return successResponse(result.data);
  } catch (error) {
    console.error('Chat completion error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * Handle AI embedding requests
 */
export async function handleEmbedding(
  request: Request,
  env: Env
): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await request.json();
    const { input, model, userId } = body;

    // Validation
    if (!input) {
      return errorResponse('Invalid request: input is required', 400);
    }

    // Create AI service
    const aiService = new CloudflareAIService(
      {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        gatewayId: env.AI_GATEWAY_ID,
        openaiApiKey: env.OPENAI_API_KEY,
      },
      env.CACHE
    );

    // Make AI request
    const result = await aiService.embedding({
      input,
      model,
      userId: userId || 'anonymous',
    });

    if (!result.success) {
      return errorResponse(result.error || 'AI request failed', 500, {
        errorCode: result.errorCode,
      });
    }

    return successResponse(result.data);
  } catch (error) {
    console.error('Embedding error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * Handle streaming chat completion requests
 */
export async function handleStreamingChat(
  request: Request,
  env: Env
): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await request.json();
    const { messages, model, temperature, maxTokens, userId } = body;

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('Invalid request: messages array is required', 400);
    }

    // Create AI service
    const aiService = new CloudflareAIService(
      {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        gatewayId: env.AI_GATEWAY_ID,
        openaiApiKey: env.OPENAI_API_KEY,
      },
      env.CACHE
    );

    // Get streaming response
    const stream = await aiService.streamChatCompletion({
      messages,
      model,
      temperature,
      maxTokens,
      userId: userId || 'anonymous',
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Streaming chat error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
