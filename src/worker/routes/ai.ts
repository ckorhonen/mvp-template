import type { WorkerContext } from '../types/env';
import { AIGatewayService, streamChatCompletion } from '../services/ai-gateway';
import { successResponse, errorResponse, sseResponse } from '../utils/response';
import { validateJsonBody, validateRequired } from '../utils/validation';
import { RateLimiter, getRateLimitKey } from '../utils/rate-limit';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIRoutes');

/**
 * POST /api/ai/chat
 * Create a chat completion
 */
export async function handleChatCompletion(ctx: WorkerContext): Promise<Response> {
  try {
    // Rate limiting
    const rateLimiter = new RateLimiter(ctx.env);
    const key = getRateLimitKey(ctx.request);
    await rateLimiter.enforce(key, { requests: 10, window: 60 });

    // Validate request body
    const body = await validateJsonBody<{
      messages: any[];
      model?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    }>(ctx.request);

    validateRequired(body, ['messages']);

    // Create AI Gateway service
    const aiGateway = new AIGatewayService(ctx.env);

    // Create chat completion request
    const request = {
      model: body.model || 'gpt-4-turbo-preview',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1000,
      stream: body.stream ?? false,
    };

    const result = await aiGateway.createChatCompletion(request);

    // Handle streaming response
    if (result instanceof ReadableStream) {
      return sseResponse(result);
    }

    return successResponse(result);
  } catch (error) {
    logger.error('Chat completion failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * POST /api/ai/embed
 * Create embeddings for text
 */
export async function handleEmbedding(ctx: WorkerContext): Promise<Response> {
  try {
    // Rate limiting
    const rateLimiter = new RateLimiter(ctx.env);
    const key = getRateLimitKey(ctx.request);
    await rateLimiter.enforce(key, { requests: 20, window: 60 });

    // Validate request body
    const body = await validateJsonBody<{
      input: string | string[];
      model?: string;
    }>(ctx.request);

    validateRequired(body, ['input']);

    // Create AI Gateway service
    const aiGateway = new AIGatewayService(ctx.env);

    // Create embedding request
    const result = await aiGateway.createEmbedding({
      model: body.model || 'text-embedding-ada-002',
      input: body.input,
    });

    return successResponse(result);
  } catch (error) {
    logger.error('Embedding creation failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * POST /api/ai/image
 * Generate images from text prompt
 */
export async function handleImageGeneration(ctx: WorkerContext): Promise<Response> {
  try {
    // Rate limiting (stricter for image generation)
    const rateLimiter = new RateLimiter(ctx.env);
    const key = getRateLimitKey(ctx.request);
    await rateLimiter.enforce(key, { requests: 5, window: 60 });

    // Validate request body
    const body = await validateJsonBody<{
      prompt: string;
      n?: number;
      size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
    }>(ctx.request);

    validateRequired(body, ['prompt']);

    // Create AI Gateway service
    const aiGateway = new AIGatewayService(ctx.env);

    // Generate image
    const result = await aiGateway.generateImage({
      prompt: body.prompt,
      n: body.n || 1,
      size: body.size || '1024x1024',
      quality: body.quality || 'standard',
    });

    return successResponse(result);
  } catch (error) {
    logger.error('Image generation failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}
