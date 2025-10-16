import type { WorkerContext } from '../types/env';
import { successResponse, errorResponse, noContentResponse } from '../utils/response';
import { CacheHelper, cacheKey } from '../utils/cache';
import { createLogger } from '../utils/logger';
import { StorageError } from '../utils/errors';

const logger = createLogger('StorageRoutes');

/**
 * GET /api/cache/:key
 * Get a value from KV cache
 */
export async function handleGetCache(ctx: WorkerContext, key: string): Promise<Response> {
  try {
    const cache = new CacheHelper(ctx.env);
    const value = await cache.get(key);

    if (value === null) {
      return successResponse({ found: false }, undefined, 404);
    }

    return successResponse({ found: true, value });
  } catch (error) {
    logger.error('Get cache failed', { error, key });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * PUT /api/cache/:key
 * Set a value in KV cache
 */
export async function handleSetCache(ctx: WorkerContext, key: string): Promise<Response> {
  try {
    const body = await ctx.request.json();
    const ttl = body.ttl || 3600; // Default 1 hour

    const cache = new CacheHelper(ctx.env);
    await cache.set(key, body.value, { ttl });

    return successResponse({ success: true, key, ttl });
  } catch (error) {
    logger.error('Set cache failed', { error, key });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * DELETE /api/cache/:key
 * Delete a value from KV cache
 */
export async function handleDeleteCache(ctx: WorkerContext, key: string): Promise<Response> {
  try {
    const cache = new CacheHelper(ctx.env);
    await cache.delete(key);

    return noContentResponse();
  } catch (error) {
    logger.error('Delete cache failed', { error, key });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * POST /api/upload
 * Upload a file to R2
 */
export async function handleUpload(ctx: WorkerContext): Promise<Response> {
  try {
    const contentType = ctx.request.headers.get('Content-Type') || 'application/octet-stream';
    const fileName = ctx.request.headers.get('X-File-Name') || `upload-${Date.now()}`;
    
    // Get file data
    const body = await ctx.request.arrayBuffer();

    // Upload to R2
    await ctx.env.UPLOADS.put(fileName, body, {
      httpMetadata: {
        contentType,
      },
    });

    logger.info('File uploaded', { fileName, size: body.byteLength });

    return successResponse({
      success: true,
      fileName,
      size: body.byteLength,
      url: `/api/files/${fileName}`,
    });
  } catch (error) {
    logger.error('Upload failed', { error });
    return errorResponse(
      new StorageError('Failed to upload file'),
      500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * GET /api/files/:key
 * Download a file from R2
 */
export async function handleDownload(ctx: WorkerContext, key: string): Promise<Response> {
  try {
    const object = await ctx.env.UPLOADS.get(key);

    if (!object) {
      return errorResponse(new Error('File not found'), 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', String(object.size));
    headers.set('ETag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    logger.error('Download failed', { error, key });
    return errorResponse(
      new StorageError('Failed to download file'),
      500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * DELETE /api/files/:key
 * Delete a file from R2
 */
export async function handleDeleteFile(ctx: WorkerContext, key: string): Promise<Response> {
  try {
    await ctx.env.UPLOADS.delete(key);
    logger.info('File deleted', { fileName: key });
    return noContentResponse();
  } catch (error) {
    logger.error('Delete file failed', { error, key });
    return errorResponse(
      new StorageError('Failed to delete file'),
      500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}
