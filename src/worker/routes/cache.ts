/**
 * Cache Routes
 * Example API routes demonstrating KV cache operations
 */

import type { Context } from '../types';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../utils/response';
import { KVCache } from '../utils/cache';

/**
 * GET /api/cache/:key
 * Get cached value
 */
export async function getCacheValue(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const key = params?.key;
    if (!key) {
      return badRequestResponse('Cache key is required');
    }

    const cache = new KVCache(ctx.env.CACHE);
    const value = await cache.get(key);

    if (value === null) {
      return notFoundResponse('Cache entry not found');
    }

    return successResponse({ key, value });
  } catch (error) {
    console.error('Get cache error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get cache value',
      500
    );
  }
}

/**
 * POST /api/cache
 * Set cached value
 */
export async function setCacheValue(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.request.json<{
      key: string;
      value: unknown;
      ttl?: number;
    }>();

    if (!body.key || body.value === undefined) {
      return badRequestResponse('Key and value are required');
    }

    const cache = new KVCache(ctx.env.CACHE);
    await cache.set(body.key, body.value, { ttl: body.ttl || 3600 });

    return successResponse({ message: 'Value cached successfully' }, 201);
  } catch (error) {
    console.error('Set cache error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to set cache value',
      500
    );
  }
}

/**
 * DELETE /api/cache/:key
 * Delete cached value
 */
export async function deleteCacheValue(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const key = params?.key;
    if (!key) {
      return badRequestResponse('Cache key is required');
    }

    const cache = new KVCache(ctx.env.CACHE);
    await cache.delete(key);

    return successResponse({ message: 'Cache entry deleted successfully' });
  } catch (error) {
    console.error('Delete cache error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete cache value',
      500
    );
  }
}
