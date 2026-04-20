/**
 * R2 Storage Route Handlers
 * Handle object storage operations
 */

import { Env } from '../types/env';
import { jsonResponse, errorResponse, createdResponse, noContentResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { Logger } from '../utils/logger';

/**
 * Upload a file to R2
 */
export async function handleR2Upload(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;

    if (!file) {
      throw new ValidationError('File is required');
    }

    const fileName = key || file.name || `upload-${Date.now()}`;

    logger.info('R2 upload', { fileName, size: file.size, type: file.type });

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.UPLOADS.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    });

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['r2-upload'],
        doubles: [file.size],
        indexes: [fileName],
      });
    }

    return createdResponse(
      {
        key: fileName,
        size: file.size,
        type: file.type,
      },
      'File uploaded successfully'
    );
  } catch (error) {
    logger.error('R2 upload error', error);
    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to upload file to R2', 500, 'R2_ERROR', {
      error: (error as Error).message,
    });
  }
}

/**
 * Download a file from R2
 */
export async function handleR2Download(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { key } = params;

  try {
    logger.info('R2 download', { key });

    const object = await env.UPLOADS.get(key);

    if (!object) {
      throw new NotFoundError(`File '${key}' not found`);
    }

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['r2-download'],
        doubles: [object.size],
        indexes: [key],
      });
    }

    const headers: HeadersInit = {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Length': object.size.toString(),
      'ETag': object.httpEtag,
      'Last-Modified': object.uploaded.toUTCString(),
    };

    return new Response(object.body, { headers });
  } catch (error) {
    logger.error('R2 download error', error);
    if (error instanceof NotFoundError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to download file from R2', 500, 'R2_ERROR', {
      key,
      error: (error as Error).message,
    });
  }
}

/**
 * List objects in R2 bucket
 */
export async function handleR2List(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);

  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const cursor = url.searchParams.get('cursor') || undefined;

    logger.info('R2 list', { prefix, limit, cursor });

    const result = await env.UPLOADS.list({ prefix, limit, cursor });

    return jsonResponse({
      objects: result.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        httpEtag: obj.httpEtag,
      })),
      truncated: result.truncated,
      cursor: result.cursor,
    });
  } catch (error) {
    logger.error('R2 list error', error);
    return errorResponse('Failed to list files from R2', 500, 'R2_ERROR', {
      error: (error as Error).message,
    });
  }
}

/**
 * Delete a file from R2
 */
export async function handleR2Delete(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { key } = params;

  try {
    logger.info('R2 delete', { key });

    await env.UPLOADS.delete(key);

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['r2-delete'],
        indexes: [key],
      });
    }

    return noContentResponse();
  } catch (error) {
    logger.error('R2 delete error', error);
    return errorResponse('Failed to delete file from R2', 500, 'R2_ERROR', {
      key,
      error: (error as Error).message,
    });
  }
}
