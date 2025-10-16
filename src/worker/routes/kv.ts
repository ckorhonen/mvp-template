/**
 * KV Storage Routes
 * Example endpoints showcasing KV namespace operations
 */

import { jsonResponse, errorResponse, parseJSON, checkRateLimit } from '../lib/utils';
import type { Env } from '../types';

export async function handleKVRoutes(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/kv/cache/:key - Get cached value
    if (path.match(/^\/api\/kv\/cache\/.+$/) && request.method === 'GET') {
      const key = path.split('/').pop()!;
      const value = await env.CACHE.get(key, 'json');

      if (!value) {
        return errorResponse('Key not found', 404);
      }

      return jsonResponse({ key, value });
    }

    // POST /api/kv/cache - Set cached value
    if (path === '/api/kv/cache' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.key || body.value === undefined) {
        return errorResponse('Key and value are required', 400);
      }

      const ttl = body.ttl || 3600; // Default 1 hour
      await env.CACHE.put(body.key, JSON.stringify(body.value), {
        expirationTtl: ttl,
      });

      return jsonResponse({
        success: true,
        key: body.key,
        ttl,
      });
    }

    // DELETE /api/kv/cache/:key - Delete cached value
    if (path.match(/^\/api\/kv\/cache\/.+$/) && request.method === 'DELETE') {
      const key = path.split('/').pop()!;
      await env.CACHE.delete(key);

      return jsonResponse({ success: true });
    }

    // POST /api/kv/rate-limit - Check rate limit
    if (path === '/api/kv/rate-limit' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.identifier) {
        return errorResponse('Identifier is required', 400);
      }

      const result = await checkRateLimit(
        env.CACHE,
        body.identifier,
        body.limit || 100,
        body.window || 3600
      );

      if (!result.allowed) {
        return jsonResponse(
          {
            allowed: false,
            remaining: 0,
            resetAt: result.resetAt,
          },
          429
        );
      }

      return jsonResponse(result);
    }

    // GET /api/kv/list - List keys in KV
    if (path === '/api/kv/list' && request.method === 'GET') {
      const prefix = url.searchParams.get('prefix') || '';
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const list = await env.CACHE.list({ prefix, limit });

      return jsonResponse({
        keys: list.keys.map((k) => k.name),
        cursor: list.cursor,
        list_complete: list.list_complete,
      });
    }

    return errorResponse('Not found', 404);
  } catch (error) {
    console.error('KV route error:', error);
    return errorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}
