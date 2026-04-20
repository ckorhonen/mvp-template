/**
 * AI Gateway Route Handlers
 * Handle AI requests through Cloudflare AI Gateway with OpenAI
 */

import { Env, AIGatewayRequest, AIGatewayResponse } from '../types/env';
import { jsonResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../middleware/errorHandler';
import { validateRequiredFields } from '../utils/validation';
import { Logger } from '../utils/logger';

/**
 * Get AI Gateway endpoint URL
 */
function getAIGatewayUrl(env: Env): string {
  return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openai`;
}

/**
 * Handle AI chat completion requests
 */
export async function handleAIChat(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);

  try {
    // Check if AI is enabled
    if (env.FEATURE_AI_ENABLED !== 'true') {
      return errorResponse('AI feature is not enabled', 503);
    }

    // Parse request body
    const body = await request.json() as any;

    // Validate required fields
    const errors = validateRequiredFields(body, ['messages']);
    if (errors.length > 0) {
      throw new ValidationError('Invalid request', errors);
    }

    // Prepare AI Gateway request
    const aiRequest: AIGatewayRequest = {
      model: body.model || env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: body.messages,
      temperature: body.temperature || parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7'),
      max_tokens: body.max_tokens || 1000,
      stream: false,
    };

    logger.info('AI chat request', {
      model: aiRequest.model,
      messageCount: aiRequest.messages.length,
    });

    // Call AI Gateway (OpenAI)
    const aiResponse = await fetch(`${getAIGatewayUrl(env)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(aiRequest),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      logger.error('AI Gateway error', { status: aiResponse.status, error });
      return errorResponse(
        'AI Gateway request failed',
        aiResponse.status,
        'AI_GATEWAY_ERROR',
        { details: error }
      );
    }

    const aiData = await aiResponse.json() as AIGatewayResponse;

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['ai-chat'],
        doubles: [aiData.usage.total_tokens],
        indexes: [aiData.model],
      });
    }

    logger.info('AI chat response', {
      model: aiData.model,
      tokens: aiData.usage.total_tokens,
    });

    return jsonResponse({
      response: aiData.choices[0].message?.content,
      model: aiData.model,
      usage: aiData.usage,
    });
  } catch (error) {
    logger.error('AI chat error', error);
    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }
    return errorResponse('Failed to process AI request', 500);
  }
}

/**
 * Handle AI text completion requests
 */
export async function handleAICompletion(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);

  try {
    // Check if AI is enabled
    if (env.FEATURE_AI_ENABLED !== 'true') {
      return errorResponse('AI feature is not enabled', 503);
    }

    // Parse request body
    const body = await request.json() as any;

    // Validate required fields
    const errors = validateRequiredFields(body, ['prompt']);
    if (errors.length > 0) {
      throw new ValidationError('Invalid request', errors);
    }

    // Prepare AI Gateway request
    const aiRequest = {
      model: body.model || 'gpt-3.5-turbo-instruct',
      prompt: body.prompt,
      temperature: body.temperature || parseFloat(env.AI_DEFAULT_TEMPERATURE || '0.7'),
      max_tokens: body.max_tokens || 1000,
    };

    logger.info('AI completion request', {
      model: aiRequest.model,
      promptLength: aiRequest.prompt.length,
    });

    // Call AI Gateway (OpenAI)
    const aiResponse = await fetch(`${getAIGatewayUrl(env)}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(aiRequest),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      logger.error('AI Gateway error', { status: aiResponse.status, error });
      return errorResponse(
        'AI Gateway request failed',
        aiResponse.status,
        'AI_GATEWAY_ERROR',
        { details: error }
      );
    }

    const aiData = await aiResponse.json() as AIGatewayResponse;

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['ai-completion'],
        doubles: [aiData.usage.total_tokens],
        indexes: [aiData.model],
      });
    }

    logger.info('AI completion response', {
      model: aiData.model,
      tokens: aiData.usage.total_tokens,
    });

    return jsonResponse({
      response: aiData.choices[0].text,
      model: aiData.model,
      usage: aiData.usage,
    });
  } catch (error) {
    logger.error('AI completion error', error);
    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }
    return errorResponse('Failed to process AI request', 500);
  }
}
