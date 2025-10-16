/**
 * KV Storage route examples
 * Demonstrates KV operations for caching and key-value storage
 */

import { z } from 'zod';
import type { Env } from '../types';
import { jsonResponse, errorResponses, noContentResponse } from '../utils/response';
import { validateBody } from '../utils/validation';
import { NotFoundError, toApiError } from '../utils/errors';

const setKVSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.unknown(),
  ttl: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listKeysSchema = z.object({
  prefix: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  cursor: z.string().optional(),
});

/**
 * POST /api/kv - Set a key-value pair
 */
export async function handleSetKV(request: Request, env: Env): Promise<Response> {
  try {
    const validation = await validateBody(request, setKVSchema);
    if (!validation.success) {
      return errorResponses.badRequest('Invalid request', { errors: validation.error });
    }

    const { key, value, ttl, metadata } = validation.data;

    // Convert value to string
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Store in KV with optional TTL and metadata
    const options: Record<string, unknown> = {};
    if (ttl) {
      options.expirationTtl = ttl;
    }
    if (metadata) {
      options.metadata = metadata;
    }

    await env.CACHE.put(key, stringValue, options);

    return jsonResponse(
      {
        key,
        message: 'Value stored successfully',
        expiresIn: ttl ? `${ttl} seconds` : 'never',
      },
      201
    );
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * GET /api/kv/:key - Get a value by key
 */
export async function handleGetKV(key: string, env: Env): Promise<Response> {
  try {
    // Get value and metadata
    const { value, metadata } = await env.CACHE.getWithMetadata(key, 'text');

    if (value === null) {
      throw new NotFoundError('Key');
    }

    // Try to parse as JSON
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    return jsonResponse({
      key,
      value: parsedValue,
      metadata,
    });
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError instanceof NotFoundError) {
      return errorResponses.notFound(`Key '${key}' not found`);
    }
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * DELETE /api/kv/:key - Delete a key
 */
export async function handleDeleteKV(key: string, env: Env): Promise<Response> {
  try {
    await env.CACHE.delete(key);
    return noContentResponse();
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * GET /api/kv - List keys with optional prefix
 */
export async function handleListKeys(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const cursor = url.searchParams.get('cursor') || undefined;

    const listResult = await env.CACHE.list({
      prefix,
      limit,
      cursor,
    });

    return jsonResponse({
      keys: listResult.keys.map(k => ({
        name: k.name,
        expiration: k.expiration,
        metadata: k.metadata,
      })),
      listComplete: listResult.list_complete,
      cursor: listResult.cursor,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}
