import { RouteHandler } from '../types';
import { ResponseBuilder } from '../utils/response';
import { RequestValidator } from '../utils/validation';
import { CacheManager } from '../utils/cache';

/**
 * KV Cache route handlers
 */

/**
 * GET /api/cache/:key - Get cached value
 */
export const getCacheHandler: RouteHandler = async (request, env, ctx, params) => {
  const key = params?.key;
  
  if (!key) {
    throw new Error('Cache key is required');
  }

  const value = await CacheManager.getFromKV(env.MY_KV, decodeURIComponent(key));

  if (value === null) {
    return ResponseBuilder.error(
      new Error('Key not found'),
      404
    );
  }

  return ResponseBuilder.success({ value });
};

/**
 * POST /api/cache - Set cached value
 */
export const setCacheHandler: RouteHandler = async (request, env) => {
  const body = await RequestValidator.parseJSON<{
    key: string;
    value: any;
    ttl?: number;
  }>(request);

  RequestValidator.validateRequired(body, ['key', 'value']);

  await CacheManager.setInKV(
    env.MY_KV,
    body.key,
    body.value,
    { ttl: body.ttl }
  );

  return ResponseBuilder.success({
    message: 'Value cached successfully',
    key: body.key,
  });
};

/**
 * DELETE /api/cache/:key - Delete cached value
 */
export const deleteCacheHandler: RouteHandler = async (request, env, ctx, params) => {
  const key = params?.key;
  
  if (!key) {
    throw new Error('Cache key is required');
  }

  await CacheManager.deleteFromKV(env.MY_KV, decodeURIComponent(key));

  return ResponseBuilder.success({ message: 'Key deleted successfully' });
};
