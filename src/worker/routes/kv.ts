/**
 * KV Storage Route Handlers
 * Handle key-value storage operations
 */

import { Env } from '../types/env';
import { jsonResponse, errorResponse, createdResponse, noContentResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { Logger } from '../utils/logger';

/**
 * Get a value from KV storage
 */
export async function handleKVGet(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { key } = params;

  try {
    logger.info('KV get', { key });

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'text';

    let value;
    if (type === 'json') {
      value = await env.CACHE.get(key, 'json');
    } else if (type === 'arrayBuffer') {
      value = await env.CACHE.get(key, 'arrayBuffer');
    } else if (type === 'stream') {
      value = await env.CACHE.get(key, 'stream');
    } else {
      value = await env.CACHE.get(key);
    }

    if (value === null) {
      throw new NotFoundError(`Key '${key}' not found`);
    }

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['kv-get'],
        indexes: [key],
      });
    }

    return jsonResponse({ key, value });
  } catch (error) {
    logger.error('KV get error', error);
    if (error instanceof NotFoundError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to get value from KV', 500, 'KV_ERROR', {
      key,
      error: (error as Error).message,
    });
  }
}

/**
 * Set a value in KV storage
 */
export async function handleKVSet(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { key } = params;

  try {
    const body = await request.json() as any;

    if (!body.value) {
      throw new ValidationError('Value is required');
    }

    logger.info('KV set', { key });

    // Prepare KV options
    const options: any = {};
    if (body.ttl) {
      options.expirationTtl = parseInt(body.ttl, 10);
    }
    if (body.metadata) {
      options.metadata = body.metadata;
    }

    // Store value in KV
    const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
    await env.CACHE.put(key, value, options);

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['kv-set'],
        indexes: [key],
      });
    }

    return createdResponse({ key, value: body.value }, 'Value stored successfully');
  } catch (error) {
    logger.error('KV set error', error);
    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to set value in KV', 500, 'KV_ERROR', {
      key,
      error: (error as Error).message,
    });
  }
}

/**
 * Delete a value from KV storage
 */
export async function handleKVDelete(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { key } = params;

  try {
    logger.info('KV delete', { key });

    await env.CACHE.delete(key);

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['kv-delete'],
        indexes: [key],
      });
    }

    return noContentResponse();
  } catch (error) {
    logger.error('KV delete error', error);
    return errorResponse('Failed to delete value from KV', 500, 'KV_ERROR', {
      key,
      error: (error as Error).message,
    });
  }
}

/**
 * List keys in KV storage
 */
export async function handleKVList(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);

  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const cursor = url.searchParams.get('cursor') || undefined;

    logger.info('KV list', { prefix, limit, cursor });

    const result = await env.CACHE.list({ prefix, limit, cursor });

    return jsonResponse({
      keys: result.keys,
      list_complete: result.list_complete,
      cursor: result.cursor,
    });
  } catch (error) {
    logger.error('KV list error', error);
    return errorResponse('Failed to list keys from KV', 500, 'KV_ERROR', {
      error: (error as Error).message,
    });
  }
}
