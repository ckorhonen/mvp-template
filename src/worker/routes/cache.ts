/**
 * KV cache routes
 */

import type { Env } from '../types/env';
import type { CacheEntry } from '../types/models';
import { successResponse, notFoundError, validationError } from '../utils/response';
import { parseJsonBody, validateRequiredFields, isString, isNumber } from '../utils/validation';
import { NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

/**
 * Get a value from KV cache
 */
export async function getCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Getting cache value', { key });

    const value = await env.CACHE.get(key, { type: 'json' });

    if (value === null) {
      logger.warn('Cache miss', { key });
      throw new NotFoundError('Cache entry');
    }

    logger.info('Cache hit', { key });

    return successResponse(value);
  } catch (error) {
    logger.error('Failed to get cache value', error);
    if (error instanceof NotFoundError) {
      return notFoundError('Cache entry');
    }
    throw error;
  }
}

/**
 * Set a value in KV cache
 */
export async function setCacheValue(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const body = await parseJsonBody<{
      key: string;
      value: any;
      ttl?: number;
      metadata?: Record<string, any>;
    }>(request);

    // Validate required fields
    const validation = validateRequiredFields(body, ['key', 'value']);
    if (!validation.valid) {
      return validationError('Missing required fields', {
        missing: validation.missing,
      });
    }

    if (!isString(body.key)) {
      return validationError('Key must be a string');
    }

    logger.info('Setting cache value', { key: body.key, hasTTL: !!body.ttl });

    // Prepare cache entry with metadata
    const cacheEntry: CacheEntry = {
      value: body.value,
      cachedAt: new Date().toISOString(),
      expiresAt: body.ttl
        ? new Date(Date.now() + body.ttl * 1000).toISOString()
        : undefined,
    };

    // Set value in KV with optional TTL and metadata
    const options: KVNamespacePutOptions = {
      metadata: body.metadata || {},
    };

    if (body.ttl && isNumber(body.ttl)) {
      options.expirationTtl = body.ttl;
    }

    await env.CACHE.put(body.key, JSON.stringify(cacheEntry), options);

    logger.info('Cache value set', { key: body.key });

    return successResponse(
      {
        key: body.key,
        message: 'Value cached successfully',
        ...cacheEntry,
      },
      201
    );
  } catch (error) {
    logger.error('Failed to set cache value', error);
    throw error;
  }
}

/**
 * Delete a value from KV cache
 */
export async function deleteCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Deleting cache value', { key });

    await env.CACHE.delete(key);

    logger.info('Cache value deleted', { key });

    return successResponse({
      key,
      message: 'Cache entry deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete cache value', error);
    throw error;
  }
}

/**
 * List cache keys with optional prefix
 */
export async function listCacheKeys(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get('limit') || '10', 10)
    );

    logger.info('Listing cache keys', { prefix, limit });

    const list = await env.CACHE.list({ prefix, limit });

    logger.info('Cache keys listed', { count: list.keys.length });

    return successResponse({
      keys: list.keys,
      list_complete: list.list_complete,
      cursor: list.cursor,
    });
  } catch (error) {
    logger.error('Failed to list cache keys', error);
    throw error;
  }
}
