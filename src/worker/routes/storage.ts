/**
 * Storage Routes
 * Handles KV and R2 storage operations
 */

import { Env } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { validateRequest } from '../utils/validation';

/**
 * GET /api/cache/:key - Get a value from KV cache
 */
export async function getCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const value = await env.CACHE.get(key, { type: 'json' });

    if (value === null) {
      return errorResponse('Key not found', 404);
    }

    return successResponse({ key, value });
  } catch (error) {
    console.error('Get cache value error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get cache value',
      500
    );
  }
}

/**
 * PUT /api/cache/:key - Set a value in KV cache
 */
export async function setCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateRequest(body, {
      value: { type: ['string', 'number', 'boolean', 'object'], required: true },
      ttl: { type: 'number', required: false, min: 60 },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const { value, ttl } = body;

    const options: KVNamespacePutOptions = {};
    if (ttl) {
      options.expirationTtl = ttl;
    }

    await env.CACHE.put(key, JSON.stringify(value), options);

    return successResponse({
      message: 'Value cached successfully',
      key,
      ttl: ttl || null,
    });
  } catch (error) {
    console.error('Set cache value error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to set cache value',
      500
    );
  }
}

/**
 * DELETE /api/cache/:key - Delete a value from KV cache
 */
export async function deleteCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    await env.CACHE.delete(key);

    return successResponse({
      message: 'Value deleted successfully',
      key,
    });
  } catch (error) {
    console.error('Delete cache value error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete cache value',
      500
    );
  }
}

/**
 * GET /api/cache - List cache keys
 */
export async function listCacheKeys(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const list = await env.CACHE.list({ prefix, limit });

    return successResponse({
      keys: list.keys,
      list_complete: list.list_complete,
      cursor: list.cursor,
    });
  } catch (error) {
    console.error('List cache keys error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list cache keys',
      500
    );
  }
}

/**
 * POST /api/uploads - Upload a file to R2
 */
export async function uploadFile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Content-Type must be multipart/form-data', 400);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const key = `uploads/${timestamp}-${randomId}-${file.name}`;

    // Upload to R2
    await env.UPLOADS.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return successResponse(
      {
        message: 'File uploaded successfully',
        key,
        name: file.name,
        size: file.size,
        type: file.type,
      },
      201
    );
  } catch (error) {
    console.error('Upload file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to upload file',
      500
    );
  }
}

/**
 * GET /api/uploads/:key - Download a file from R2
 */
export async function downloadFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    // Decode the key (it may be URL encoded)
    const decodedKey = decodeURIComponent(key);

    const object = await env.UPLOADS.get(decodedKey);

    if (!object) {
      return errorResponse('File not found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Download file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to download file',
      500
    );
  }
}

/**
 * DELETE /api/uploads/:key - Delete a file from R2
 */
export async function deleteFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const decodedKey = decodeURIComponent(key);
    await env.UPLOADS.delete(decodedKey);

    return successResponse({
      message: 'File deleted successfully',
      key: decodedKey,
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete file',
      500
    );
  }
}

/**
 * GET /api/uploads - List uploaded files
 */
export async function listFiles(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const list = await env.UPLOADS.list({ prefix, limit });

    const files = list.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpEtag: obj.httpEtag,
    }));

    return successResponse({
      files,
      truncated: list.truncated,
      cursor: list.truncated ? list.cursor : null,
    });
  } catch (error) {
    console.error('List files error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list files',
      500
    );
  }
}
