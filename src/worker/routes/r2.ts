/**
 * R2 Storage API Routes
 * File upload, download, and management examples
 */

import { Env, FileMetadata } from '../types';
import { successResponse, errorResponse, ErrorResponses } from '../utils/response';
import { createLogger } from '../utils/logger';

/**
 * GET /api/r2/files/:key
 * Download a file from R2
 */
export async function handleGetFile(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'r2-get');

  try {
    logger.info('Getting file from R2', { key });

    const object = await env.STORAGE.get(key);

    if (!object) {
      return ErrorResponses.notFound('File not found', requestId);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error: any) {
    logger.error('Get file error', error);
    return ErrorResponses.internalError(
      'Failed to get file',
      error.message,
      requestId
    );
  }
}

/**
 * PUT /api/r2/files/:key
 * Upload a file to R2
 */
export async function handleUploadFile(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'r2-upload');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = request.headers.get('Content-Length');

    logger.info('Uploading file to R2', { key, contentType, contentLength });

    // Get the file data
    const body = await request.arrayBuffer();

    // Store file metadata
    const metadata: FileMetadata = {
      filename: key,
      contentType,
      size: body.byteLength,
      uploadedBy: undefined, // Add user ID if authenticated
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    };

    // Upload to R2
    await env.STORAGE.put(key, body, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        metadata: JSON.stringify(metadata),
      },
    });

    logger.info('File uploaded successfully', { key });

    return successResponse(
      { key, size: body.byteLength },
      201,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Upload file error', error);
    return ErrorResponses.internalError(
      'Failed to upload file',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * DELETE /api/r2/files/:key
 * Delete a file from R2
 */
export async function handleDeleteFile(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'r2-delete');
  const origin = request.headers.get('Origin') || undefined;

  try {
    logger.info('Deleting file from R2', { key });

    await env.STORAGE.delete(key);

    return successResponse(
      { key },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Delete file error', error);
    return ErrorResponses.internalError(
      'Failed to delete file',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * GET /api/r2/files
 * List files in R2
 */
export async function handleListFiles(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'r2-list');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = Math.min(1000, parseInt(url.searchParams.get('limit') || '100', 10));

    logger.info('Listing files in R2', { prefix, limit });

    const listed = await env.STORAGE.list({
      prefix,
      limit,
    });

    const files = listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      etag: obj.httpEtag,
    }));

    return successResponse(
      {
        files,
        truncated: listed.truncated,
        count: files.length,
      },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('List files error', error);
    return ErrorResponses.internalError(
      'Failed to list files',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * HEAD /api/r2/files/:key
 * Get file metadata without downloading
 */
export async function handleHeadFile(
  request: Request,
  env: Env,
  key: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'r2-head');

  try {
    logger.info('Getting file metadata from R2', { key });

    const object = await env.STORAGE.head(key);

    if (!object) {
      return ErrorResponses.notFound('File not found', requestId);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('content-length', object.size.toString());

    return new Response(null, { headers });
  } catch (error: any) {
    logger.error('Head file error', error);
    return ErrorResponses.internalError(
      'Failed to get file metadata',
      error.message,
      requestId
    );
  }
}
