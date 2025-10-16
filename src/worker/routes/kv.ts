/**
 * KV Namespace API Routes
 * Caching and key-value storage examples
 */

import { Env } from '../types';
import { successResponse, errorResponse, ErrorResponses } from '../utils/response';
import { parseJsonBody, validateRequiredFields } from '../utils/validation';
import { KVCache } from '../utils/cache';
import { createLogger } from '../utils/logger';

/**
 * GET /api/kv/cache/:key
 * Get a value from cache
 */
export async function handleGetCache(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'kv-get');
  const origin = request.headers.get('Origin') || undefined;

  try {
    logger.info('Getting cache value', { key });

    const cache = new KVCache(env.CACHE);
    const value = await cache.get(key);

    if (value === null) {
      return ErrorResponses.notFound(
        'Cache key not found',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    return successResponse(
      { key, value },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Get cache error', error);
    return ErrorResponses.internalError(
      'Failed to get cache value',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * PUT /api/kv/cache/:key
 * Set a value in cache
 */
export async function handleSetCache(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'kv-set');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const body = await parseJsonBody<{
      value: any;
      ttl?: number;
    }>(request);

    const validation = validateRequiredFields(body, ['value']);
    if (!validation.valid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missing.join(', ')}`,
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Setting cache value', { key, ttl: body.ttl });

    const cache = new KVCache(env.CACHE);
    await cache.set(key, body.value, body.ttl || 3600);

    return successResponse(
      { key, ttl: body.ttl || 3600 },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Set cache error', error);
    return ErrorResponses.internalError(
      'Failed to set cache value',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * DELETE /api/kv/cache/:key
 * Delete a value from cache
 */
export async function handleDeleteCache(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'kv-delete');
  const origin = request.headers.get('Origin') || undefined;

  try {
    logger.info('Deleting cache value', { key });

    const cache = new KVCache(env.CACHE);
    await cache.delete(key);

    return successResponse(
      { key },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Delete cache error', error);
    return ErrorResponses.internalError(
      'Failed to delete cache value',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * GET /api/kv/cache
 * List cache keys
 */
export async function handleListCache(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'kv-list');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10));

    logger.info('Listing cache keys', { prefix, limit });

    const cache = new KVCache(env.CACHE);
    const keys = await cache.listKeys(prefix, limit);

    return successResponse(
      { keys, count: keys.length },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('List cache error', error);
    return ErrorResponses.internalError(
      'Failed to list cache keys',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}
