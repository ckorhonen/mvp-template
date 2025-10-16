/**
 * Storage Routes (KV, R2)
 * 
 * Example routes demonstrating KV and R2 storage operations.
 */

import type { Env } from '../types';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '../utils/response';
import { createCacheManager } from '../utils/cache';

/**
 * GET /api/cache/:key
 * Get a value from KV cache
 */
export async function handleGetCache(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const cache = createCacheManager(env);
    const value = await cache.get(key);

    if (value === null) {
      return notFoundResponse('Cache key not found');
    }

    return successResponse({ key, value });
  } catch (error) {
    console.error('Get cache error:', error);
    return serverErrorResponse('Failed to get cache value', error as Error);
  }
}

/**
 * PUT /api/cache/:key
 * Set a value in KV cache
 */
export async function handleSetCache(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const body = await request.json() as { value: unknown; ttl?: number };
    const cache = createCacheManager(env);
    
    await cache.set(key, body.value, { ttl: body.ttl });

    return successResponse({ key, cached: true });
  } catch (error) {
    console.error('Set cache error:', error);
    return serverErrorResponse('Failed to set cache value', error as Error);
  }
}

/**
 * DELETE /api/cache/:key
 * Delete a value from KV cache
 */
export async function handleDeleteCache(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const cache = createCacheManager(env);
    await cache.delete(key);

    return successResponse({ key, deleted: true });
  } catch (error) {
    console.error('Delete cache error:', error);
    return serverErrorResponse('Failed to delete cache value', error as Error);
  }
}

/**
 * POST /api/uploads
 * Upload a file to R2
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse('No file provided');
    }

    const fileName = `${Date.now()}-${file.name}`;
    const key = `uploads/${fileName}`;

    await env.UPLOADS.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return successResponse({
      key,
      fileName,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return serverErrorResponse('Failed to upload file', error as Error);
  }
}

/**
 * GET /api/uploads/:key
 * Get a file from R2
 */
export async function handleGetFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    const object = await env.UPLOADS.get(`uploads/${key}`);

    if (!object) {
      return notFoundResponse('File not found');
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get file error:', error);
    return serverErrorResponse('Failed to get file', error as Error);
  }
}

/**
 * DELETE /api/uploads/:key
 * Delete a file from R2
 */
export async function handleDeleteFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    await env.UPLOADS.delete(`uploads/${key}`);
    return successResponse({ key, deleted: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return serverErrorResponse('Failed to delete file', error as Error);
  }
}

/**
 * GET /api/uploads
 * List all uploaded files
 */
export async function handleListFiles(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || 'uploads/';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const listed = await env.UPLOADS.list({ prefix, limit });

    const files = listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      etag: obj.etag,
    }));

    return successResponse({
      files,
      truncated: listed.truncated,
      cursor: listed.cursor,
    });
  } catch (error) {
    console.error('List files error:', error);
    return serverErrorResponse('Failed to list files', error as Error);
  }
}
