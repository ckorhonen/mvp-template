/**
 * Combined Example Route
 * Demonstrates using multiple Cloudflare services together
 */

import { Env } from '../types/env';
import { jsonResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../middleware/errorHandler';
import { validateRequiredFields } from '../utils/validation';
import { Logger } from '../utils/logger';

/**
 * Combined example: Process text with AI, store in D1, cache in KV, backup to R2
 */
export async function handleCombinedExample(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);

  try {
    const body = await request.json() as any;

    // Validate input
    const errors = validateRequiredFields(body, ['text']);
    if (errors.length > 0) {
      throw new ValidationError('Invalid request', errors);
    }

    const { text } = body;
    const requestId = crypto.randomUUID();

    logger.info('Combined example started', { requestId, textLength: text.length });

    // Step 1: Check cache first (KV)
    const cacheKey = `combined:${text}`;
    const cached = await env.CACHE.get(cacheKey, 'json');
    if (cached) {
      logger.info('Cache hit', { requestId });
      return jsonResponse({ ...cached, cached: true });
    }

    // Step 2: Process with AI (AI Gateway)
    let aiResponse = null;
    if (env.FEATURE_AI_ENABLED === 'true') {
      try {
        const aiRequest = {
          model: env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant. Summarize the following text concisely.',
            },
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          max_tokens: 150,
        };

        const aiUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openai/chat/completions`;
        const response = await fetch(aiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(aiRequest),
        });

        if (response.ok) {
          const aiData = (await response.json()) as any;
          aiResponse = aiData.choices[0].message.content;
          logger.info('AI processing complete', { requestId });
        }
      } catch (error) {
        logger.warn('AI processing failed, continuing without summary', { requestId, error });
      }
    }

    // Step 3: Store in database (D1)
    const timestamp = new Date().toISOString();
    try {
      await env.DB.prepare(
        'INSERT INTO processed_texts (id, original_text, summary, created_at) VALUES (?, ?, ?, ?)'
      )
        .bind(requestId, text, aiResponse || 'N/A', timestamp)
        .run();
      logger.info('Stored in database', { requestId });
    } catch (error) {
      logger.warn('Database storage failed, continuing', { requestId, error });
    }

    // Step 4: Cache result (KV)
    const result = {
      id: requestId,
      originalText: text,
      summary: aiResponse,
      timestamp,
    };

    try {
      await env.CACHE.put(cacheKey, JSON.stringify(result), {
        expirationTtl: 3600, // 1 hour
      });
      logger.info('Cached result', { requestId });
    } catch (error) {
      logger.warn('Cache storage failed', { requestId, error });
    }

    // Step 5: Backup to R2
    try {
      const backup = JSON.stringify(result, null, 2);
      await env.BACKUPS.put(`combined/${requestId}.json`, backup, {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          timestamp,
        },
      });
      logger.info('Backed up to R2', { requestId });
    } catch (error) {
      logger.warn('R2 backup failed', { requestId, error });
    }

    // Track analytics
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['combined-example'],
        doubles: [text.length],
        indexes: [requestId],
      });
    }

    logger.info('Combined example completed', { requestId });

    return jsonResponse({
      ...result,
      cached: false,
      services: {
        ai: aiResponse !== null,
        database: true,
        cache: true,
        backup: true,
      },
    });
  } catch (error) {
    logger.error('Combined example error', error);
    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }
    return errorResponse('Failed to process combined example', 500);
  }
}
