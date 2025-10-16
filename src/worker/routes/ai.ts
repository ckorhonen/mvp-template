/**
 * AI API Routes
 * 
 * Endpoints for AI functionality using Cloudflare AI Gateway
 */

import { Env } from '../types';
import { AIService, ChatCompletionRequest } from '../services/ai';
import { createSuccessResponse, parseJsonBody } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { KVRateLimiter } from '../utils/rate-limiter';

/**
 * POST /api/ai/chat
 * Create a chat completion
 */
export async function handleChatCompletion(
  request: Request,
  env: Env
): Promise<Response> {
  // Rate limiting
  const rateLimiter = new KVRateLimiter(env.CACHE, {
    requestsPerWindow: 10,
    windowMs: 60000, // 1 minute
  });

  const clientId = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const rateLimitInfo = await rateLimiter.checkLimit(`ai:chat:${clientId}`);

  // Parse request body
  const body = await parseJsonBody<ChatCompletionRequest>(request);

  // Validate request
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError('Messages array is required and must not be empty');
  }

  if (!body.model) {
    throw new ValidationError('Model is required');
  }

  // Create AI service and make request
  const aiService = new AIService(env);
  const completion = await aiService.createChatCompletion(body);

  // Return response with rate limit headers
  return createSuccessResponse(
    completion,
    200,
    rateLimiter.getRateLimitHeaders(rateLimitInfo)
  );
}

/**
 * POST /api/ai/chat/stream
 * Create a streaming chat completion
 */
export async function handleStreamingChatCompletion(
  request: Request,
  env: Env
): Promise<Response> {
  // Parse request body
  const body = await parseJsonBody<ChatCompletionRequest>(request);

  // Validate request
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError('Messages array is required and must not be empty');
  }

  if (!body.model) {
    throw new ValidationError('Model is required');
  }

  // Create AI service and make streaming request
  const aiService = new AIService(env);
  const stream = await aiService.createStreamingChatCompletion(body);

  // Return streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * POST /api/ai/embeddings
 * Create text embeddings
 */
export async function handleCreateEmbedding(
  request: Request,
  env: Env
): Promise<Response> {
  // Rate limiting
  const rateLimiter = new KVRateLimiter(env.CACHE, {
    requestsPerWindow: 20,
    windowMs: 60000, // 1 minute
  });

  const clientId = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const rateLimitInfo = await rateLimiter.checkLimit(`ai:embeddings:${clientId}`);

  // Parse request body
  const body = await parseJsonBody<{ input: string | string[]; model?: string }>(request);

  // Validate request
  if (!body.input) {
    throw new ValidationError('Input is required');
  }

  // Create AI service and make request
  const aiService = new AIService(env);
  const embeddings = await aiService.createEmbedding(body.input, body.model);

  // Return response with rate limit headers
  return createSuccessResponse(
    embeddings,
    200,
    rateLimiter.getRateLimitHeaders(rateLimitInfo)
  );
}

/**
 * POST /api/ai/images/generate
 * Generate an image using DALL-E
 */
export async function handleGenerateImage(
  request: Request,
  env: Env
): Promise<Response> {
  // Rate limiting (stricter for image generation)
  const rateLimiter = new KVRateLimiter(env.CACHE, {
    requestsPerWindow: 5,
    windowMs: 60000, // 1 minute
  });

  const clientId = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const rateLimitInfo = await rateLimiter.checkLimit(`ai:images:${clientId}`);

  // Parse request body
  const body = await parseJsonBody<{
    prompt: string;
    model?: string;
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    n?: number;
  }>(request);

  // Validate request
  if (!body.prompt) {
    throw new ValidationError('Prompt is required');
  }

  // Create AI service and make request
  const aiService = new AIService(env);
  const images = await aiService.generateImage(body.prompt, {
    model: body.model,
    size: body.size,
    quality: body.quality,
    n: body.n,
  });

  // Return response with rate limit headers
  return createSuccessResponse(
    images,
    200,
    rateLimiter.getRateLimitHeaders(rateLimitInfo)
  );
}
